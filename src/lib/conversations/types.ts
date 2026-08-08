/** Structured escalation reasons used by AI + agents. */
export const ESCALATION_REASONS = [
  "AI_UNABLE_TO_RESOLVE",
  "CUSTOMER_REQUESTED_HUMAN",
  "ACCOUNT_SPECIFIC_ACTION",
  "BILLING_ISSUE",
  "REFUND_REQUEST",
  "TECHNICAL_ISSUE",
  "KNOWLEDGE_NOT_FOUND",
  "CONFIGURED_ESCALATION_RULE",
  "OTHER",
] as const;

export type EscalationReason = (typeof ESCALATION_REASONS)[number];

export type ConversationStatus =
  | "ai_active"
  | "escalated"
  | "human_handling"
  | "resolved"
  | "active"
  | "closed";

export type HandlingMode = "AI" | "HUMAN";

export type MessageRole = "user" | "assistant" | "agent" | "system";

export type ConversationPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type ConversationListFilter =
  | "all"
  | "active"
  | "escalated"
  | "unassigned"
  | "mine"
  | "assigned"
  | "resolved"
  | "human_handling";

export function isEscalationReason(value: string): value is EscalationReason {
  return (ESCALATION_REASONS as readonly string[]).includes(value);
}

/** Normalize legacy status values from early schema drafts. */
export function normalizeConversationStatus(
  status: string | null | undefined
): ConversationStatus {
  if (status === "active") return "ai_active";
  if (status === "closed") return "resolved";
  if (
    status === "ai_active" ||
    status === "escalated" ||
    status === "human_handling" ||
    status === "resolved"
  ) {
    return status;
  }
  return "ai_active";
}

export function isAiEligible(handlingMode: string | null | undefined): boolean {
  // Only AI mode may auto-generate replies. HUMAN mode = persist customer messages and wait.
  return (handlingMode ?? "AI") === "AI";
}
