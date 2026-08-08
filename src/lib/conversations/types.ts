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

export type ConversationMode =
  | "AI_ACTIVE"
  | "ESCALATED_WAITING_FOR_HUMAN"
  | "HUMAN_ACTIVE"
  | "RESOLVED";

export type ConversationStateLike = {
  status?: string | null;
  handling_mode?: string | null;
  assigned_agent_email?: string | null;
};

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

export function getConversationMode(
  conversation: ConversationStateLike | null | undefined
): ConversationMode {
  if (!conversation) return "RESOLVED";

  const status = normalizeConversationStatus(conversation.status);
  if (status === "resolved") return "RESOLVED";

  if ((conversation.handling_mode ?? "AI") === "HUMAN") {
    return conversation.assigned_agent_email?.trim()
      ? "HUMAN_ACTIVE"
      : "ESCALATED_WAITING_FOR_HUMAN";
  }

  return "AI_ACTIVE";
}

export function shouldAIRespond(
  conversation: ConversationStateLike | null | undefined
): boolean {
  return getConversationMode(conversation) === "AI_ACTIVE";
}

export function needsEscalationAcknowledgement(
  conversation: ConversationStateLike | null | undefined
): boolean {
  return getConversationMode(conversation) === "ESCALATED_WAITING_FOR_HUMAN";
}
