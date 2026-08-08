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
  /\b(forward(ed|ing)?\b|forward(ed|ing)? (this|your).{0,40}(support|team|agent)|human agent will|connect(ing)? you with (our )?support|support team (will|isn)|I've (forwarded|escalated)|I('ll| will) (forward|escalate))\b/i;

const DEFAULT_ESCALATION_CUSTOMER_MESSAGE =
  "I've forwarded your request to our support team. An agent will respond as soon as they're available.";

const SAFE_CONVERSATIONAL_REPLIES = {
  greeting: "Hi! How can I help you today?",
  thanks: "You're welcome. Anything else I can help with?",
  farewell: "Thanks for chatting. Have a great day!",
  acknowledgement: "Got it. What would you like help with?",
  vague: "Can you share a bit more detail?",
  identity: "I'm Sarah, a customer support assistant.",
} as const;

const BILLING_OR_ACCOUNT_ACTION_PATTERN =
  /\b(refund|cancel|charge|charged|payment|invoice|subscription|billing|bill|account|login|password|order|tracking|ship(ped|ment|ping)?|return|exchange|technical issue|bug|broken|error|not working)\b/i;

type SafeConversationalIntent = keyof typeof SAFE_CONVERSATIONAL_REPLIES;

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

export function detectSafeConversationalIntent(
  userMessage: string
): SafeConversationalIntent | null {
  const normalized = userMessage
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'?]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "vague";
  if (CUSTOMER_HUMAN_PATTERNS.test(normalized)) return null;
  if (BILLING_OR_ACCOUNT_ACTION_PATTERN.test(normalized)) return null;

  const words = normalized.split(" ").filter(Boolean);
  if (words.length > 8) return null;

  if (
    /^(hi+|hii+|hey+|hello+|helo+|yo|namaste|gm|good morning|good afternoon|good evening)( there)?$/.test(
      normalized
    )
  ) {
    return "greeting";
  }

  if (/^(thanks?|thank you|thx|ty|appreciate it|ok thanks|okay thanks)$/.test(normalized)) {
    return "thanks";
  }

  if (/^(bye|goodbye|see you|cya|talk later|good night)$/.test(normalized)) {
    return "farewell";
  }

  if (/^(ok|okay|k|cool|great|nice|sure|yes|yeah|yep|no|nope|alright|got it)$/.test(normalized)) {
    return "acknowledgement";
  }

  if (/^(help|help me|can you help|i need help|question|quick question|\?)$/.test(normalized)) {
    return "vague";
  }

  if (
    /^(who are you|what are you|your name|what is your name|who am i talking to|are you (a )?(bot|ai|human))$/.test(
      normalized
    )
  ) {
    return "identity";
  }

  return null;
}

function safeConversationalReply(intent: SafeConversationalIntent): string {
  return SAFE_CONVERSATIONAL_REPLIES[intent];
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
  const safeIntent = detectSafeConversationalIntent(userMessage);

  if (parsedBlock) {
    if (
      safeIntent &&
      (parsedBlock.reason === "KNOWLEDGE_NOT_FOUND" ||
        parsedBlock.reason === "AI_UNABLE_TO_RESOLVE" ||
        parsedBlock.reason === "CONFIGURED_ESCALATION_RULE")
    ) {
      return {
        shouldEscalate: false,
        reason: "OTHER",
        summary: "",
        customerMessage: AI_ESCALATE_PHRASES.test(cleanedAi)
          ? safeConversationalReply(safeIntent)
          : cleanedAi || safeConversationalReply(safeIntent),
      };
    }

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
    args.hadKnowledgeSources &&
    args.usedRag === false &&
    fallback === "escalate" &&
    !safeIntent;

  if (AI_ESCALATE_PHRASES.test(cleanedAi || rawAi) || knowledgeMiss) {
    if (safeIntent) {
      return {
        shouldEscalate: false,
        reason: "OTHER",
        summary: "",
        customerMessage: safeConversationalReply(safeIntent),
      };
    }

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
