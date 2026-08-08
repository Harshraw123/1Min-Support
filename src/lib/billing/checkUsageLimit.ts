import { db } from "@/db/client";
import { workspace_usage_monthly } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { isMissingRelationError } from "@/lib/db/pgErrors";
import { currentYearMonth } from "./constants";
import { getWorkspaceBilling } from "./getWorkspacePlan";

export type AiMessageQuota = {
  allowed: boolean;
  reason: string | null;
  used: number;
  limit: number;
  remaining: number;
  yearMonth: string;
  planSlug: "free" | "pro";
  status: string;
};

async function getMonthlyUsed(workspaceId: string, yearMonth: string): Promise<number> {
  try {
    const [row] = await db
      .select({ ai_messages: workspace_usage_monthly.ai_messages })
      .from(workspace_usage_monthly)
      .where(
        and(
          eq(workspace_usage_monthly.workspace_id, workspaceId),
          eq(workspace_usage_monthly.year_month, yearMonth)
        )
      )
      .limit(1);
    return Number(row?.ai_messages ?? 0);
  } catch (error) {
    if (isMissingRelationError(error)) return 0;
    throw error;
  }
}

/**
 * Server-side AI abuse gate: only billable AI generations count.
 * Call before Groq on widget chat. Dashboard test chat must not use enforce.
 */
export async function checkAiMessageQuota(args: {
  workspace_id: string;
  enforce?: boolean;
}): Promise<AiMessageQuota> {
  const yearMonth = currentYearMonth();
  const billing = await getWorkspaceBilling(args.workspace_id);
  const used = await getMonthlyUsed(args.workspace_id, yearMonth);
  const limit = billing.aiMessageLimit;
  const remaining = Math.max(0, limit - used);
  const over = used >= limit;

  if (!args.enforce) {
    return {
      allowed: true,
      reason: null,
      used,
      limit,
      remaining,
      yearMonth,
      planSlug: billing.planSlug,
      status: billing.status,
    };
  }

  if (over) {
    return {
      allowed: false,
      reason:
        billing.planSlug === "pro"
          ? "Monthly AI message limit reached for your Pro plan. It resets next month."
          : "Monthly AI message limit reached on the Free plan. Upgrade to Pro or wait until next month.",
      used,
      limit,
      remaining: 0,
      yearMonth,
      planSlug: billing.planSlug,
      status: billing.status,
    };
  }

  return {
    allowed: true,
    reason: null,
    used,
    limit,
    remaining,
    yearMonth,
    planSlug: billing.planSlug,
    status: billing.status,
  };
}

/**
 * Increment after a successful billable AI reply (not on Groq failure).
 * Upserts the monthly counter atomically.
 */
export async function incrementAiMessageUsage(workspaceId: string, by = 1): Promise<number> {
  const yearMonth = currentYearMonth();
  const amount = Math.max(1, Math.floor(by));

  try {
    const [row] = await db
      .insert(workspace_usage_monthly)
      .values({
        workspace_id: workspaceId,
        year_month: yearMonth,
        ai_messages: amount,
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [workspace_usage_monthly.workspace_id, workspace_usage_monthly.year_month],
        set: {
          ai_messages: sql`${workspace_usage_monthly.ai_messages} + ${amount}`,
          updated_at: new Date(),
        },
      })
      .returning({ ai_messages: workspace_usage_monthly.ai_messages });

    return Number(row?.ai_messages ?? amount);
  } catch (error) {
    console.error("[AI_USAGE_INCREMENT_ERROR]", error);
    if (isMissingRelationError(error)) return 0;
    throw error;
  }
}

