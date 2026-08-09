import type { EscalationReason } from "./types";
import { isEscalationReason } from "./types";

export type EscalationSignal = {
  shouldEscalate: boolean;
  reason: EscalationReason;
  summary: string;
  /** Customer-facing reply with machine markers stripped. */
  customerMessage: string;
  /** True when we declined off-topic/gibberish instead of escalating. */
  scopeDeclined?: boolean;
};

/**
 * How the latest customer turn should be routed in HITL.
 * - safe_conversational: greetings/thanks — AI only, never escalate
 * - scope_decline: off-topic / gibberish / useless — polite decline, never escalate
 * - request_human: explicit human ask — escalate / waiting ack
 * - waiting_followup: "any update?" while already queued — waiting ack, no new escalate
 * - support_question: real business/support intent — AI tries, escalate only if needed
 */
export type CustomerTurnKind =
  | "safe_conversational"
  | "scope_decline"
  | "request_human"
  | "waiting_followup"
  | "support_question";

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

const WAITING_FOLLOWUP_PATTERNS =
  /\b(any update|still waiting|is anyone there|you there|status of (my )?(request|ticket|case)|when will (someone|an agent)|heard back|follow[- ]?up)\b/i;

const OFF_TOPIC_PATTERNS =
  /\b(weather|joke|jokes|meme|lyrics|recipe|homework|math problem|write (me )?(a |an )?(poem|essay|story|code|script)|who won|football score|cricket score|horoscope|dating advice|tell me a (joke|story)|play a game|riddle|capital of|what time is it)\b/i;

const BUSINESS_SUPPORT_PATTERNS =
  /\b(price|pricing|plan|plans|feature|features|product|service|policy|policies|refund|cancel|charge|payment|invoice|subscription|billing|account|login|password|order|tracking|ship(ped|ment|ping)?|return|exchange|bug|broken|error|not working|how (do|does|can|to)|support|help with|onboard|integration|api|trial|demo|upgrade|downgrade)\b/i;

const DEFAULT_ESCALATION_CUSTOMER_MESSAGE =
  "I've forwarded your request to our support team. An agent will respond as soon as they're available.";

const OFFLINE_QUEUE_BOILERPLATE =
  /\s*Our support team isn't always online immediately, but your conversation has been saved and an agent will respond as soon as they're available\.?/gi;

export const SCOPE_DECLINE_MESSAGE =
  "I can only help with business-related questions about our product and support. Please ask something related to that, and I'll be happy to help.";

const ALREADY_ESCALATED_NOTE =
  "I've noted this for our support team who's already reviewing your conversation. Feel free to ask other product questions in the meantime.";

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

/** Strip the recurring "support team isn't always online…" suffix from answers. */
export function stripOfflineQueueBoilerplate(text: string): string {
  return stripEscalationMarkers(text)
    .replace(OFFLINE_QUEUE_BOILERPLATE, "")
    // Model often copies this shorter handoff tail onto real product answers.
    .replace(
      /\s*(?:Our support team isn't always online[^.]*\.|Your conversation has been saved[^.]*\.)+/gi,
      ""
    )
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

function isGibberishOrUseless(userMessage: string): boolean {
  const t = userMessage.trim();
  if (!t) return true;
  if (/^(.)\1{3,}$/u.test(t)) return true;
  if (/^(asdf+|qwer+|zxcv+|test(ing)?|abc|xyz|123+|!+|\/+)$/i.test(t)) return true;

  const letters = (t.match(/\p{L}/gu) || []).length;
  const alnum = (t.match(/[\p{L}\p{N}]/gu) || []).length;
  if (t.length >= 6 && alnum / t.length < 0.35) return true;
  if (t.length >= 4 && letters / Math.max(t.length, 1) < 0.3) return true;

  // Keyboard smash: short, no spaces, almost no vowels.
  const compact = t.replace(/\s+/g, "");
  if (
    compact.length >= 5 &&
    compact.length <= 16 &&
    !/\s/.test(t) &&
    letters >= 4 &&
    (compact.match(/[aeiou]/gi) || []).length <= 1 &&
    !BUSINESS_SUPPORT_PATTERNS.test(t)
  ) {
    return true;
  }

  return false;
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
  if (OFF_TOPIC_PATTERNS.test(normalized)) return null;
  if (isGibberishOrUseless(normalized)) return null;

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
 * Classify the customer turn for HITL routing (AI vs waiting ack vs escalate).
 */
export function classifyCustomerTurn(userMessage: string): CustomerTurnKind {
  const trimmed = userMessage.trim();
  if (!trimmed) return "scope_decline";

  if (CUSTOMER_HUMAN_PATTERNS.test(trimmed)) return "request_human";
  if (WAITING_FOLLOWUP_PATTERNS.test(trimmed)) return "waiting_followup";

  if (isGibberishOrUseless(trimmed) || OFF_TOPIC_PATTERNS.test(trimmed)) {
    // Explicit business keywords win over weak off-topic matches.
    if (!BUSINESS_SUPPORT_PATTERNS.test(trimmed) && !BILLING_OR_ACCOUNT_ACTION_PATTERN.test(trimmed)) {
      return "scope_decline";
    }
  }

  if (detectSafeConversationalIntent(trimmed)) return "safe_conversational";
  return "support_question";
}

/** While queued for a human, AI may still answer these turns. */
export function shouldAiAssistWhileEscalated(kind: CustomerTurnKind): boolean {
  return (
    kind === "safe_conversational" ||
    kind === "scope_decline" ||
    kind === "support_question"
  );
}

export function scopeDeclineMessage(): string {
  return SCOPE_DECLINE_MESSAGE;
}

export function alreadyEscalatedCustomerNote(): string {
  return ALREADY_ESCALATED_NOTE;
}

/** True when the assistant text is only queue/forward boilerplate (no real answer). */
export function isEscalationBoilerplateOnly(text: string): boolean {
  const cleaned = stripEscalationMarkers(text).trim();
  if (!cleaned) return true;
  if (cleaned === ALREADY_ESCALATED_NOTE) return true;
  if (cleaned === DEFAULT_ESCALATION_CUSTOMER_MESSAGE) return true;

  const forwardHeavy =
    /\b(forward(ed|ing)?|escalat(ed|ion|e)|support team|human agent|noted this for our support|already reviewing your conversation)\b/i.test(
      cleaned
    );
  const hasSubstance =
    cleaned.split(/\s+/).filter(Boolean).length >= 8 &&
    !/^(i('ve| have) (forwarded|noted)|our support team)/i.test(cleaned);

  // Short forward-only lines, or long lines that are still only handoff language.
  if (forwardHeavy && !hasSubstance) return true;
  if (
    forwardHeavy &&
    /feel free to ask other product questions|agent will (respond|reply|continue)/i.test(cleaned) &&
    cleaned.split(/\s+/).length <= 40
  ) {
    return true;
  }
  return false;
}

/**
 * Parse optional machine marker the model may emit:
 *   [[ESCALATE|REASON|short summary for the support agent]]
 * followed by the customer-facing message.
 *
 * Also detects customer requests for a human and soft AI escalate phrasing.
 * Off-topic / gibberish / useless turns never escalate — they get a scope decline.
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
  const turnKind = classifyCustomerTurn(userMessage);
  const safeIntent = detectSafeConversationalIntent(userMessage);

  // Hard gate: never escalate off-topic / gibberish / useless noise.
  if (turnKind === "scope_decline") {
    return {
      shouldEscalate: false,
      reason: "OTHER",
      summary: "",
      customerMessage: SCOPE_DECLINE_MESSAGE,
      scopeDeclined: true,
    };
  }

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

    // Model sometimes escalates "out of scope" as KNOWLEDGE_NOT_FOUND — decline instead.
    if (
      turnKind !== "request_human" &&
      !BUSINESS_SUPPORT_PATTERNS.test(userMessage) &&
      !BILLING_OR_ACCOUNT_ACTION_PATTERN.test(userMessage) &&
      (parsedBlock.reason === "KNOWLEDGE_NOT_FOUND" ||
        parsedBlock.reason === "AI_UNABLE_TO_RESOLVE" ||
        parsedBlock.reason === "OTHER")
    ) {
      const looksLikeScopeDecline =
        /business-related|only help with|not (able|something) i can help|outside (my|of) (scope|what)/i.test(
          cleanedAi
        ) || userMessage.split(/\s+/).filter(Boolean).length <= 3;

      if (looksLikeScopeDecline) {
        return {
          shouldEscalate: false,
          reason: "OTHER",
          summary: "",
          customerMessage: cleanedAi || SCOPE_DECLINE_MESSAGE,
          scopeDeclined: true,
        };
      }
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
    if (turnKind === "safe_conversational" && safeIntent) {
      return {
        shouldEscalate: false,
        reason: "OTHER",
        summary: "",
        customerMessage: safeConversationalReply(safeIntent),
      };
    }
    return {
      shouldEscalate: true,
      reason: "AI_UNABLE_TO_RESOLVE",
      summary: `Customer asked: "${userMessage.slice(0, 240)}"`,
      customerMessage: cleanedAi || DEFAULT_ESCALATION_CUSTOMER_MESSAGE,
    };
  }

  if (CUSTOMER_HUMAN_PATTERNS.test(userMessage) || turnKind === "request_human") {
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
    !safeIntent &&
    turnKind === "support_question";

  // Knowledge miss on a vague/non-business ping → clarify or decline, don't escalate.
  if (
    args.hadKnowledgeSources &&
    args.usedRag === false &&
    turnKind !== "support_question"
  ) {
    if (safeIntent) {
      return {
        shouldEscalate: false,
        reason: "OTHER",
        summary: "",
        customerMessage: safeConversationalReply(safeIntent),
      };
    }
  }

  if (AI_ESCALATE_PHRASES.test(cleanedAi || rawAi) || knowledgeMiss) {
    if (safeIntent) {
      return {
        shouldEscalate: false,
        reason: "OTHER",
        summary: "",
        customerMessage: safeConversationalReply(safeIntent),
      };
    }

    // Soft "forwarded to support" on a non-support chat → scope decline, not queue.
    if (
      !knowledgeMiss &&
      turnKind !== "support_question" &&
      !BILLING_OR_ACCOUNT_ACTION_PATTERN.test(userMessage)
    ) {
      return {
        shouldEscalate: false,
        reason: "OTHER",
        summary: "",
        customerMessage: SCOPE_DECLINE_MESSAGE,
        scopeDeclined: true,
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

  // If the model already gave a scope-style answer without escalating, keep it.
  if (
    /only help with business-related|business-related questions/i.test(cleanedAi) &&
    turnKind !== "support_question"
  ) {
    return {
      shouldEscalate: false,
      reason: "OTHER",
      summary: "",
      customerMessage: cleanedAi || SCOPE_DECLINE_MESSAGE,
      scopeDeclined: true,
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
  const trimmed = stripOfflineQueueBoilerplate(base);
  if (!trimmed) return DEFAULT_ESCALATION_CUSTOMER_MESSAGE;

  if (
    /as soon as (they'?re|they are) available|isn'?t currently available|when (an )?agent/i.test(
      trimmed
    )
  ) {
    return trimmed;
  }

  // Real product/support answers must NOT get the offline queue line glued on.
  // Only append for short handoff / escalate-style messages.
  if (!isEscalationBoilerplateOnly(trimmed) && trimmed.split(/\s+/).filter(Boolean).length > 12) {
    return trimmed;
  }

  return `${trimmed}${trimmed.endsWith(".") ? "" : "."} Our support team isn't always online immediately, but your conversation has been saved and an agent will respond as soon as they're available.`;
}
