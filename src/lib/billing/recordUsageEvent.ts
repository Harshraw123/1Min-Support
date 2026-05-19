import { db } from "@/db/client";
import { usage_events } from "@/db/schema";

export type UsageEventType =
  | "knowledge_ingest"
  | "content_clean"
  | "content_summarize"
  | "embedding_generate"
  | "chunk_store"
  | "chat_completion"
  | "widget_message"
  | "dashboard_test_message"
  | "retrieval_query";

export type UsageProvider = "groq" | "huggingface" | "internal";

export type RecordUsageEventInput = {
  workspace_id: string;
  section_id?: string | null;
  knowledge_id?: string | null;
  conversation_id?: string | null;
  message_id?: string | null;
  event_type: UsageEventType;
  provider?: UsageProvider | null;
  model?: string | null;
  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  total_tokens?: number | null;
  embedding_tokens?: number | null;
  chunk_count?: number | null;
  message_count?: number | null;
  metadata?: Record<string, unknown> | null;
  billable?: boolean;
};

function nullableNumber(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : null;
}

export async function recordUsageEvent(
  input: RecordUsageEventInput,
  options?: { throwOnError?: boolean }
) {
  try {
    await db.insert(usage_events).values({
      workspace_id: input.workspace_id,
      section_id: input.section_id ?? null,
      knowledge_id: input.knowledge_id ?? null,
      conversation_id: input.conversation_id ?? null,
      message_id: input.message_id ?? null,
      event_type: input.event_type,
      provider: input.provider ?? null,
      model: input.model ?? null,
      prompt_tokens: nullableNumber(input.prompt_tokens),
      completion_tokens: nullableNumber(input.completion_tokens),
      total_tokens: nullableNumber(input.total_tokens),
      embedding_tokens: nullableNumber(input.embedding_tokens),
      chunk_count: nullableNumber(input.chunk_count),
      message_count: nullableNumber(input.message_count),
      metadata: input.metadata ?? null,
      billable: input.billable ?? true,
    });
  } catch (error) {
    console.error("[USAGE_EVENT_ERROR]", error);
    if (options?.throwOnError) {
      throw error;
    }
  }
}
