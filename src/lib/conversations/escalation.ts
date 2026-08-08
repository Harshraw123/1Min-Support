import type { EscalationReason } from "./types";
import { isEscalationReason } from "./types";

export type EscalationSignal = {
  shouldEscalate: boolean;
  reason: EscalationReason;
  summary: string;
  /** Customer-facing reply with machine markers stripped. */
  customerMessage: string;
};

/**
 * Machine markers the model may emit (never show these to customers).
 * Supports common variants the LLM invents around the documented format.
 */
const ESCALATE_BLOCK_GLOBAL =
  /\[\[\s*ESCALATE\s*[|:\-]\s*([A-Z_]+)\s*[|:\-]\s*([\s\S]*?)\]\]\s*/gi;

/** Looser catch-all: any [[ESCALATE ... ]] blob, including malformed markers. */
const ESCALATE_ANY_GLOBAL = /\[\[\s*ESCALATE\b[\s\S]*?\]\]\s*/gi;

const CUSTOMER_HUMAN_PATTERNS =
  /\b(talk to (a )?human|speak to (a )?(human|person|agent|someone)|real (person|human)|human (agent|support)|customer service (agent|rep)|connect me (to|with) (an? )?agent|escalat(e|ion)|manager)\b/i;

const AI_ESCALATE_PHRASES =
  /\b(forward(ed|ing)? (this|your).{0,40}(support|team|agent)|human agent will|connect(ing)? you with (our )?support|support team (will|isn)|I've (forwarded|escalated)|I('ll| will) (forward|escalate))\b/i;

const DEFAULT_ESCALATION_CUSTOMER_MESSAGE =
  "I've forwarded your request to our support team. An agent will respond as soon as they're available.";

/**
 * Remove all escalation machine markers from text shown to customers.
 * Always run this before persisting or returning an assistant message.
 */
export function stripEscalationMarkers(text: string): string {
  return text
    .replace(ESCALATE_BLOCK_GLOBAL, "")
    .replace(ESCALATE_ANY_GLOBAL, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseEscalationBlock(rawAi: string): {
  reason: EscalationReason;
  summary: string;
} | null {
  // Reset lastIndex — these regexes are global and reused across requests.
  ESCALATE_BLOCK_GLOBAL.lastIndex = 0;
  const block = ESCALATE_BLOCK_GLOBAL.exec(rawAi);
  if (!block) return null;

  const reasonRaw = (block[1] || "OTHER").toUpperCase();
  const reason: EscalationReason = isEscalationReason(reasonRaw)
    ? reasonRaw
    : "OTHER";
  const summary = (block[2] || "Customer needs human assistance.").trim();
  return { reason, summary };
}

/**
 * Parse optional machine marker the model may emit:
 *   [[ESCALATE|REASON|short summary for the support agent]]
 * followed by the customer-facing message.
 *
 * Also detects customer requests for a human and soft AI escalate phrasing.
 * customerMessage is ALWAYS stripped of machine markers.
 */
export function detectEscalation(args: {
  userMessage: string;
  aiMessage: string;
  fallbackBehavior?: string | null;
  usedRag?: boolean;
  hadKnowledgeSources?: boolean;
}): EscalationSignal {
  const userMessage = args.userMessage.trim();
  const rawAi = args.aiMessage.trim();
  const cleanedAi = stripEscalationMarkers(rawAi);
  const parsedBlock = parseEscalationBlock(rawAi);

  if (parsedBlock) {
    return {
      shouldEscalate: true,
      reason: parsedBlock.reason,
      summary: parsedBlock.summary,
      customerMessage: cleanedAi || DEFAULT_ESCALATION_CUSTOMER_MESSAGE,
    };
  }

  // Malformed [[ESCALATE...]] without a parseable reason — still escalate + hide marker.
  ESCALATE_ANY_GLOBAL.lastIndex = 0;
  if (ESCALATE_ANY_GLOBAL.test(rawAi)) {
    return {
      shouldEscalate: true,
      reason: "AI_UNABLE_TO_RESOLVE",
      summary: `Customer asked: "${userMessage.slice(0, 240)}"`,
      customerMessage: cleanedAi || DEFAULT_ESCALATION_CUSTOMER_MESSAGE,
    };
  }

  if (CUSTOMER_HUMAN_PATTERNS.test(userMessage)) {
    return {
      shouldEscalate: true,
      reason: "CUSTOMER_REQUESTED_HUMAN",
      summary: `Customer requested a human: "${userMessage.slice(0, 240)}"`,
      customerMessage: cleanedAi || DEFAULT_ESCALATION_CUSTOMER_MESSAGE,
    };
  }

  const fallback = (args.fallbackBehavior || "").toLowerCase();
  const knowledgeMiss =
    args.hadKnowledgeSources && args.usedRag === false && fallback === "escalate";

  if (AI_ESCALATE_PHRASES.test(cleanedAi || rawAi) || knowledgeMiss) {
    let reason: EscalationReason = "AI_UNABLE_TO_RESOLVE";
    if (/\brefund\b/i.test(userMessage)) reason = "REFUND_REQUEST";
    else if (/\b(bill|payment|invoice|subscription|charge)\b/i.test(userMessage))
      reason = "BILLING_ISSUE";
    else if (knowledgeMiss) reason = "KNOWLEDGE_NOT_FOUND";
    else if (fallback === "escalate") reason = "CONFIGURED_ESCALATION_RULE";

    return {
      shouldEscalate: true,
      reason,
      summary: `Customer asked: "${userMessage.slice(0, 240)}"`,
      customerMessage: cleanedAi || DEFAULT_ESCALATION_CUSTOMER_MESSAGE,
    };
  }

  return {
    shouldEscalate: false,
    reason: "OTHER",
    summary: "",
    customerMessage: cleanedAi,
  };
}

/** Offline-safe copy when no agent has taken the conversation yet. */
export function offlineEscalationCustomerMessage(base: string): string {
  // Never let a machine marker leak through this helper either.
  const trimmed = stripEscalationMarkers(base);
  if (!trimmed) return DEFAULT_ESCALATION_CUSTOMER_MESSAGE;

  if (
    /as soon as (they'?re|they are) available|isn'?t currently available|when (an )?agent/i.test(
      trimmed
    )
  ) {
    return trimmed;
  }
  return `${trimmed}${trimmed.endsWith(".") ? "" : "."} Our support team isn't always online immediately, but your conversation has been saved and an agent will respond as soon as they're available.`;
}
