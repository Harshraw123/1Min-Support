import { db } from "@/db/client";
import { usage_events } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import { isMissingRelationError } from "@/lib/db/pgErrors";
import { getWorkspacePlan } from "./getWorkspacePlan";

export type UsageLimitCheck = {
  allowed: boolean;
  reason: string | null;
  usage: {
    aiMessages: number;
    ingestionTokens: number;
    embeddingTokens: number;
  };
  limits: {
    aiMessages: number | null;
    ingestionTokens: number | null;
    embeddingTokens: number | null;
  };
};

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

const emptyUsage = {
  aiMessages: 0,
  ingestionTokens: 0,
  embeddingTokens: 0,
};

const emptyLimits = {
  aiMessages: null,
  ingestionTokens: null,
  embeddingTokens: null,
};

export async function checkUsageLimit(args: {
  workspace_id: string;
  enforce?: boolean;
}): Promise<UsageLimitCheck> {
  const { subscription, plan } = await getWorkspacePlan(args.workspace_id);
  const now = new Date();
  const periodStart = subscription?.current_period_start ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = subscription?.current_period_end ?? now;

  let currentUsage = { ...emptyUsage };

  try {
    const [usage] = await db
      .select({
        aiMessages: sql<number>`coalesce(sum(${usage_events.message_count}) filter (where ${usage_events.event_type} in ('chat_completion','widget_message')), 0)`,
        ingestionTokens: sql<number>`coalesce(sum(${usage_events.total_tokens}) filter (where ${usage_events.event_type} in ('knowledge_ingest','content_clean','content_summarize')), 0)`,
        embeddingTokens: sql<number>`coalesce(sum(${usage_events.embedding_tokens}), 0)`,
      })
      .from(usage_events)
      .where(
        and(
          eq(usage_events.workspace_id, args.workspace_id),
          eq(usage_events.billable, true),
          gte(usage_events.created_at, periodStart),
          lte(usage_events.created_at, periodEnd)
        )
      );

    currentUsage = {
      aiMessages: toNumber(usage?.aiMessages),
      ingestionTokens: toNumber(usage?.ingestionTokens),
      embeddingTokens: toNumber(usage?.embeddingTokens),
    };
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }
  }

  const limits = {
    aiMessages: plan?.included_ai_messages ?? null,
    ingestionTokens: plan?.included_ingestion_tokens ?? null,
    embeddingTokens: plan?.included_embedding_tokens ?? null,
  };

  if (!args.enforce || !plan) {
    return {
      allowed: true,
      reason: null,
      usage: currentUsage,
      limits,
    };
  }

  if (limits.aiMessages !== null && currentUsage.aiMessages >= limits.aiMessages) {
    return {
      allowed: false,
      reason: "AI message quota exceeded",
      usage: currentUsage,
      limits,
    };
  }

  if (limits.ingestionTokens !== null && currentUsage.ingestionTokens >= limits.ingestionTokens) {
    return {
      allowed: false,
      reason: "Ingestion token quota exceeded",
      usage: currentUsage,
      limits,
    };
  }

  if (limits.embeddingTokens !== null && currentUsage.embeddingTokens >= limits.embeddingTokens) {
    return {
      allowed: false,
      reason: "Embedding token quota exceeded",
      usage: currentUsage,
      limits,
    };
  }

  return {
    allowed: true,
    reason: null,
    usage: currentUsage,
    limits,
  };
}
