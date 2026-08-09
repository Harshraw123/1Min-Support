import { db } from "@/db/client";
import { conversation, messages } from "@/db/schema";
import { and, asc, desc, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";
import type {
  ConversationListFilter,
  ConversationPriority,
  EscalationReason,
  HandlingMode,
  MessageRole,
} from "./types";
import {
  getConversationMode,
  needsEscalationAcknowledgement,
  shouldAIRespond,
} from "./types";
import { stripEscalationMarkers, stripOfflineQueueBoilerplate } from "./escalation";

export type ConversationRow = typeof conversation.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;

const ESCALATED_WAITING_MESSAGE =
  "Your request has been escalated to our support team. You can continue adding details here, and our team will review them.";

const HUMAN_ACTIVE_STATUS_MESSAGE =
  "Your conversation is being handled by our support team. Your message has been added here for the agent to review.";

const AI_FALLBACK_MESSAGE =
  "I'm having trouble answering right now. Please try again in a moment.";

function logConversationTransition(args: {
  conversationId: string;
  event: string;
  previousMode?: string;
  newMode?: string;
  agent?: string | null;
}) {
  console.log("[CONVERSATION_STATE]", {
    conversationId: args.conversationId,
    event: args.event,
    previousMode: args.previousMode,
    newMode: args.newMode,
    agent: args.agent ?? undefined,
  });
}

export function ensureUserFacingMessage(
  value: string | null | undefined,
  fallback = AI_FALLBACK_MESSAGE
): string {
  const cleaned = stripOfflineQueueBoilerplate(value ?? "").trim();
  return cleaned || fallback;
}

export function escalationWaitingAcknowledgement(extra?: string | null): string {
  const cleaned = stripEscalationMarkers(extra ?? "").trim();
  if (!cleaned) return ESCALATED_WAITING_MESSAGE;
  return `${ESCALATED_WAITING_MESSAGE} ${cleaned}`;
}

export function humanActiveStatusMessage(): string {
  return HUMAN_ACTIVE_STATUS_MESSAGE;
}

/**
 * Look up an existing conversation without creating one (used for widget resume).
 */
export async function findConversation(args: {
  chatbotId: string;
  workspaceId: string;
  conversationId?: string | null;
  visitorId?: string | null;
  includeResolved?: boolean;
}): Promise<ConversationRow | null> {
  const chatbotId = args.chatbotId.trim();
  const workspaceId = args.workspaceId.trim() || chatbotId;

  if (args.conversationId?.trim()) {
    const [existing] = await db
      .select()
      .from(conversation)
      .where(
        and(
          eq(conversation.id, args.conversationId.trim()),
          eq(conversation.chatbot_id, chatbotId),
          eq(conversation.workspace_id, workspaceId)
        )
      )
      .limit(1);
    return existing ?? null;
  }

  if (!args.visitorId?.trim()) return null;

  const conditions = [
    eq(conversation.chatbot_id, chatbotId),
    eq(conversation.workspace_id, workspaceId),
    eq(conversation.visitor_id, args.visitorId.trim()),
  ];

  if (!args.includeResolved) {
    conditions.push(ne(conversation.status, "resolved"));
    conditions.push(ne(conversation.status, "closed"));
  }

  const [open] = await db
    .select()
    .from(conversation)
    .where(and(...conditions))
    .orderBy(desc(conversation.last_message_at))
    .limit(1);

  return open ?? null;
}

/**
 * Find an open conversation for this visitor/widget, or create one.
 * Preference order:
 * 1) explicit conversationId (must match chatbot + not foreign tenant)
 * 2) latest non-resolved row for visitor_id
 * 3) insert new ai_active conversation
 *
 * Resolved threads are reused (reopened) when the same visitor returns with the same id,
 * so we do not spawn duplicate conversations on refresh.
 */
export async function getOrCreateConversation(args: {
  chatbotId: string;
  workspaceId: string;
  conversationId?: string | null;
  visitorId?: string | null;
  widgetSessionId?: string | null;
  visitorIp?: string | null;
  name?: string | null;
  sectionId?: string | null;
}): Promise<ConversationRow> {
  const chatbotId = args.chatbotId.trim();
  const workspaceId = args.workspaceId.trim() || chatbotId;

  if (args.conversationId?.trim()) {
    const [existing] = await db
      .select()
      .from(conversation)
      .where(
        and(
          eq(conversation.id, args.conversationId.trim()),
          eq(conversation.chatbot_id, chatbotId),
          eq(conversation.workspace_id, workspaceId)
        )
      )
      .limit(1);

    if (existing) {
      const patch: Partial<ConversationRow> = {};
      if (args.visitorId && !existing.visitor_id) patch.visitor_id = args.visitorId;
      if (args.widgetSessionId) patch.widget_session_id = args.widgetSessionId;
      if (args.sectionId && !existing.section_id) patch.section_id = args.sectionId;

      if (Object.keys(patch).length > 0) {
        const [updated] = await db
          .update(conversation)
          .set(patch)
          .where(eq(conversation.id, existing.id))
          .returning();
        return updated ?? existing;
      }
      return existing;
    }
  }

  if (args.visitorId?.trim()) {
    const [open] = await db
      .select()
      .from(conversation)
      .where(
        and(
          eq(conversation.chatbot_id, chatbotId),
          eq(conversation.workspace_id, workspaceId),
          eq(conversation.visitor_id, args.visitorId.trim()),
          ne(conversation.status, "resolved"),
          ne(conversation.status, "closed")
        )
      )
      .orderBy(desc(conversation.last_message_at))
      .limit(1);

    if (open) {
      if (args.widgetSessionId && open.widget_session_id !== args.widgetSessionId) {
        const [updated] = await db
          .update(conversation)
          .set({ widget_session_id: args.widgetSessionId })
          .where(eq(conversation.id, open.id))
          .returning();
        return updated ?? open;
      }
      return open;
    }
  }

  const [created] = await db
    .insert(conversation)
    .values({
      chatbot_id: chatbotId,
      workspace_id: workspaceId,
      visitor_id: args.visitorId?.trim() || null,
      widget_session_id: args.widgetSessionId?.trim() || null,
      visitor_ip: args.visitorIp?.trim() || null,
      name: args.name?.trim() || null,
      section_id: args.sectionId?.trim() || null,
      status: "ai_active",
      handling_mode: "AI",
      priority: "NORMAL",
      last_message_at: new Date(),
    })
    .returning();

  if (!created) {
    throw new Error("Failed to create conversation");
  }
  return created;
}

/**
 * Append a message with optional client_message_id idempotency.
 * On duplicate client_message_id for the same conversation, returns the existing row.
 * Assistant content is always sanitized so [[ESCALATE|...]] never lands in storage.
 */
export async function appendMessage(args: {
  conversationId: string;
  role: MessageRole;
  content: string;
  senderId?: string | null;
  senderEmail?: string | null;
  senderName?: string | null;
  clientMessageId?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<{ message: MessageRow; created: boolean }> {
  const content =
    args.role === "assistant"
      ? stripEscalationMarkers(args.content).trim() ||
        ESCALATED_WAITING_MESSAGE
      : args.content.trim();
  if (!content) {
    throw new Error("Message content is required");
  }

  const clientMessageId = args.clientMessageId?.trim() || null;

  if (clientMessageId) {
    const [dup] = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversation_id, args.conversationId),
          eq(messages.client_message_id, clientMessageId)
        )
      )
      .limit(1);
    if (dup) {
      return { message: dup, created: false };
    }
  }

  try {
    const [inserted] = await db
      .insert(messages)
      .values({
        conversation_id: args.conversationId,
        role: args.role,
        content,
        sender_id: args.senderId ?? null,
        sender_email: args.senderEmail ?? null,
        sender_name: args.senderName ?? null,
        client_message_id: clientMessageId,
        metadata: args.metadata ?? null,
      })
      .returning();

    if (!inserted) {
      throw new Error("Failed to store message");
    }

    const touch: Record<string, unknown> = {
      last_message_at: new Date(),
    };
    if (args.role === "user") {
      touch.last_customer_message = content;
    }

    await db.update(conversation).set(touch).where(eq(conversation.id, args.conversationId));

    return { message: inserted, created: true };
  } catch (error) {
    // Race: two parallel inserts with the same client_message_id — return the winner.
    if (clientMessageId) {
      const [dup] = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversation_id, args.conversationId),
            eq(messages.client_message_id, clientMessageId)
          )
        )
        .limit(1);
      if (dup) return { message: dup, created: false };
    }
    throw error;
  }
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversation_id, conversationId))
    .orderBy(asc(messages.created_at));
}

/**
 * Escalate into the support queue. Does NOT imply a human is online.
 * Sets handling_mode=HUMAN so AI auto-replies stop; status=escalated until an agent takes it.
 * Idempotent if already human-owned (keeps assignment; refreshes reason/summary if provided).
 */
export async function escalateConversation(args: {
  conversationId: string;
  workspaceId: string;
  reason: EscalationReason;
  summary: string;
  escalatedBy?: "AI" | "CUSTOMER" | "AGENT" | "SYSTEM";
  priority?: ConversationPriority;
  customerMessage?: string | null;
}): Promise<ConversationRow> {
  const now = new Date();
  const [current] = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.workspaceId)
      )
    )
    .limit(1);

  if (!current) {
    throw new Error("Conversation not found");
  }

  const alreadyHuman = current.handling_mode === "HUMAN";
  const alreadyAssigned = Boolean(current.assigned_agent_email);
  const previousMode = getConversationMode(current);

  const nextStatus = alreadyAssigned ? "human_handling" : "escalated";
  const priority =
    args.priority ??
    (args.reason === "BILLING_ISSUE" ||
    args.reason === "REFUND_REQUEST" ||
    args.reason === "ACCOUNT_SPECIFIC_ACTION"
      ? "HIGH"
      : "NORMAL");

  const [updated] = await db
    .update(conversation)
    .set({
      status: nextStatus,
      handling_mode: "HUMAN",
      escalation_reason: args.reason,
      escalation_summary: args.summary.trim() || current.escalation_summary,
      escalated_at: current.escalated_at ?? now,
      escalated_by: args.escalatedBy ?? "AI",
      priority,
      last_customer_message:
        args.customerMessage?.trim() || current.last_customer_message,
      resolved_at: null,
      resolved_by: null,
      last_message_at: now,
    })
    .where(eq(conversation.id, args.conversationId))
    .returning();

  if (!alreadyHuman) {
    // Reason codes stay in metadata + conversation columns — not in customer-visible copy.
    // Widget APIs omit system messages; inbox still shows this for agents.
    await appendMessage({
      conversationId: args.conversationId,
      role: "system",
      content: alreadyAssigned
        ? "Conversation escalated. Assigned agent will continue."
        : "Conversation escalated and placed in the support queue.",
      metadata: {
        type: "escalation",
        reason: args.reason,
        summary: args.summary,
      },
    });
  }

  logConversationTransition({
    conversationId: args.conversationId,
    event: "ESCALATION_REQUESTED",
    previousMode,
    newMode: getConversationMode(updated ?? current),
  });

  return updated ?? current;
}

/**
 * Atomic take: only succeeds when unassigned OR already owned by this agent.
 * Neon HTTP has no interactive transactions — conditional UPDATE is the concurrency control.
 */
export async function takeConversation(args: {
  conversationId: string;
  workspaceId: string;
  agentId: string | null;
  agentEmail: string;
  agentName: string;
}): Promise<
  | { ok: true; conversation: ConversationRow }
  | { ok: false; code: "NOT_FOUND" | "ALREADY_ASSIGNED"; assignedTo?: string }
> {
  const email = args.agentEmail.trim().toLowerCase();
  const now = new Date();

  // Claim if unassigned (or legacy null).
  const claimed = await db
    .update(conversation)
    .set({
      assigned_agent_id: args.agentId,
      assigned_agent_email: email,
      assigned_agent_name: args.agentName,
      assigned_at: now,
      status: "human_handling",
      handling_mode: "HUMAN",
      last_message_at: now,
    })
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.workspaceId),
        or(isNull(conversation.assigned_agent_email), eq(conversation.assigned_agent_email, ""))
      )
    )
    .returning();

  if (claimed[0]) {
    await appendMessage({
      conversationId: args.conversationId,
      role: "system",
      content: `Conversation assigned to ${args.agentName}.`,
      senderEmail: email,
      senderName: args.agentName,
      metadata: { type: "assignment", agentEmail: email },
    });
    logConversationTransition({
      conversationId: args.conversationId,
      event: "HUMAN_TAKEOVER",
      previousMode: "ESCALATED_WAITING_FOR_HUMAN",
      newMode: getConversationMode(claimed[0]),
      agent: email,
    });
    return { ok: true, conversation: claimed[0] };
  }

  const [current] = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.workspaceId)
      )
    )
    .limit(1);

  if (!current) {
    return { ok: false, code: "NOT_FOUND" };
  }

  if (current.assigned_agent_email?.toLowerCase() === email) {
    const previousMode = getConversationMode(current);
    const [refreshed] = await db
      .update(conversation)
      .set({
        status: "human_handling",
        handling_mode: "HUMAN",
        assigned_agent_name: args.agentName,
        assigned_agent_id: args.agentId ?? current.assigned_agent_id,
      })
      .where(eq(conversation.id, current.id))
      .returning();
    logConversationTransition({
      conversationId: args.conversationId,
      event: "HUMAN_TAKEOVER_REFRESHED",
      previousMode,
      newMode: getConversationMode(refreshed ?? current),
      agent: email,
    });
    return { ok: true, conversation: refreshed ?? current };
  }

  return {
    ok: false,
    code: "ALREADY_ASSIGNED",
    assignedTo: current.assigned_agent_name || current.assigned_agent_email || undefined,
  };
}

/**
 * Admin/agent assign to a specific teammate. Overwrites previous assignee intentionally
 * (used for reassignment). Still scoped to workspace_id.
 */
export async function assignConversation(args: {
  conversationId: string;
  workspaceId: string;
  agentId: string | null;
  agentEmail: string;
  agentName: string;
  assignedByEmail: string;
}): Promise<ConversationRow | null> {
  const email = args.agentEmail.trim().toLowerCase();
  const now = new Date();
  const [current] = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.workspaceId)
      )
    )
    .limit(1);

  const [updated] = await db
    .update(conversation)
    .set({
      assigned_agent_id: args.agentId,
      assigned_agent_email: email,
      assigned_agent_name: args.agentName,
      assigned_at: now,
      status: "human_handling",
      handling_mode: "HUMAN",
      last_message_at: now,
      resolved_at: null,
      resolved_by: null,
    })
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.workspaceId)
      )
    )
    .returning();

  if (!updated) return null;

  await appendMessage({
    conversationId: args.conversationId,
    role: "system",
    content: `Conversation assigned to ${args.agentName}.`,
    senderEmail: args.assignedByEmail,
    metadata: {
      type: "assignment",
      agentEmail: email,
      assignedBy: args.assignedByEmail,
    },
  });

  logConversationTransition({
    conversationId: args.conversationId,
    event: "HUMAN_ASSIGNED",
    previousMode: getConversationMode(current),
    newMode: getConversationMode(updated),
    agent: email,
  });

  return updated;
}

export async function resolveConversation(args: {
  conversationId: string;
  workspaceId: string;
  resolvedBy: string;
}): Promise<ConversationRow | null> {
  const now = new Date();
  const [current] = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.workspaceId)
      )
    )
    .limit(1);

  const [updated] = await db
    .update(conversation)
    .set({
      status: "resolved",
      handling_mode: "AI",
      assigned_agent_id: null,
      assigned_agent_email: null,
      assigned_agent_name: null,
      assigned_at: null,
      resolved_at: now,
      resolved_by: args.resolvedBy,
      last_message_at: now,
    })
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.workspaceId)
      )
    )
    .returning();

  if (!updated) return null;

  await appendMessage({
    conversationId: args.conversationId,
    role: "system",
    content: "Conversation marked as resolved.",
    senderEmail: args.resolvedBy,
    metadata: { type: "resolve" },
  });

  logConversationTransition({
    conversationId: args.conversationId,
    event: "HUMAN_HANDOFF_RESOLVED",
    previousMode: getConversationMode(current),
    newMode: getConversationMode(updated),
    agent: args.resolvedBy,
  });

  return updated;
}

/**
 * Reopen a resolved conversation. Defaults back to AI; pass preferHuman for agent-led reopen.
 */
export async function reopenConversation(args: {
  conversationId: string;
  workspaceId: string;
  reopenedBy: string;
  preferHuman?: boolean;
}): Promise<ConversationRow | null> {
  const [current] = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.workspaceId)
      )
    )
    .limit(1);

  if (!current) return null;

  const keepHuman = args.preferHuman === true;

  const nextStatus = keepHuman
    ? current.assigned_agent_email
      ? "human_handling"
      : "escalated"
    : "ai_active";
  const nextMode: HandlingMode = keepHuman ? "HUMAN" : "AI";

  const [updated] = await db
    .update(conversation)
    .set({
      status: nextStatus,
      handling_mode: nextMode,
      resolved_at: null,
      resolved_by: null,
      last_message_at: new Date(),
      ...(keepHuman
        ? {}
        : {
            assigned_agent_id: null,
            assigned_agent_email: null,
            assigned_agent_name: null,
            assigned_at: null,
          }),
    })
    .where(eq(conversation.id, current.id))
    .returning();

  await appendMessage({
    conversationId: args.conversationId,
    role: "system",
    content: keepHuman
      ? "Conversation reopened for human handling."
      : "Conversation reopened. AI handling resumed.",
    senderEmail: args.reopenedBy,
    metadata: { type: "reopen", handlingMode: nextMode },
  });

  logConversationTransition({
    conversationId: args.conversationId,
    event: keepHuman ? "CONVERSATION_REOPENED_HUMAN" : "CONVERSATION_REOPENED_AI",
    previousMode: getConversationMode(current),
    newMode: getConversationMode(updated ?? current),
    agent: args.reopenedBy,
  });

  return updated ?? current;
}

/**
 * After a human agent replies, hand the thread back to AI for subsequent customer turns.
 * Keeps escalation metadata for inbox history but clears assignment so the queue is free.
 */
export async function releaseConversationToAi(args: {
  conversationId: string;
  workspaceId: string;
  releasedBy: string;
  note?: string | null;
}): Promise<ConversationRow | null> {
  const [current] = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.workspaceId)
      )
    )
    .limit(1);

  if (!current) return null;

  // Already AI-owned — nothing to do.
  if ((current.handling_mode ?? "AI") === "AI" && current.status === "ai_active") {
    return current;
  }

  const previousMode = getConversationMode(current);
  const [updated] = await db
    .update(conversation)
    .set({
      status: "ai_active",
      handling_mode: "AI",
      assigned_agent_id: null,
      assigned_agent_email: null,
      assigned_agent_name: null,
      assigned_at: null,
      resolved_at: null,
      resolved_by: null,
      last_message_at: new Date(),
    })
    .where(eq(conversation.id, current.id))
    .returning();

  if (!updated) return current;

  await appendMessage({
    conversationId: args.conversationId,
    role: "system",
    content:
      args.note?.trim() ||
      "Human agent replied. AI handling resumed for follow-up questions.",
    senderEmail: args.releasedBy,
    metadata: { type: "release_to_ai", releasedBy: args.releasedBy },
  });

  logConversationTransition({
    conversationId: args.conversationId,
    event: "HUMAN_RELEASED_TO_AI",
    previousMode,
    newMode: getConversationMode(updated),
    agent: args.releasedBy,
  });

  return updated;
}

/**
 * Before delivering an AI reply, re-check ownership.
 * Handles the race where an agent takes over while Groq is still generating.
 */
export async function refreshConversationAiEligibility(
  conversationId: string,
  workspaceId: string
): Promise<{
  eligible: boolean;
  conversation: ConversationRow | null;
  mode: ReturnType<typeof getConversationMode>;
  needsAcknowledgement: boolean;
}> {
  const [row] = await db
    .select()
    .from(conversation)
    .where(
      and(eq(conversation.id, conversationId), eq(conversation.workspace_id, workspaceId))
    )
    .limit(1);

  if (!row) {
    return {
      eligible: false,
      conversation: null,
      mode: "RESOLVED",
      needsAcknowledgement: false,
    };
  }
  const mode = getConversationMode(row);
  const eligible = shouldAIRespond(row);
  console.log("[CONVERSATION_AI_ELIGIBILITY]", {
    conversationId,
    mode,
    aiResponseAllowed: eligible,
  });
  return {
    eligible,
    conversation: row,
    mode,
    needsAcknowledgement: needsEscalationAcknowledgement(row),
  };
}

export async function listConversationsForWorkspace(args: {
  workspaceId: string;
  filter?: ConversationListFilter;
  search?: string | null;
  agentEmail?: string | null;
  limit?: number;
}): Promise<ConversationRow[]> {
  const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
  const filter = args.filter ?? "all";
  const agentEmail = args.agentEmail?.trim().toLowerCase() || null;
  const search = args.search?.trim();

  const conditions = [eq(conversation.workspace_id, args.workspaceId)];

  if (filter === "escalated" || filter === "unassigned") {
    conditions.push(eq(conversation.status, "escalated"));
    if (filter === "unassigned") {
      conditions.push(
        or(isNull(conversation.assigned_agent_email), eq(conversation.assigned_agent_email, ""))!
      );
    }
  } else if (filter === "human_handling" || filter === "assigned") {
    conditions.push(eq(conversation.status, "human_handling"));
  } else if (filter === "mine" && agentEmail) {
    conditions.push(eq(conversation.assigned_agent_email, agentEmail));
    conditions.push(ne(conversation.status, "resolved"));
    conditions.push(ne(conversation.status, "closed"));
  } else if (filter === "resolved") {
    conditions.push(or(eq(conversation.status, "resolved"), eq(conversation.status, "closed"))!);
  } else if (filter === "active") {
    conditions.push(
      or(
        eq(conversation.status, "ai_active"),
        eq(conversation.status, "active"),
        eq(conversation.status, "escalated"),
        eq(conversation.status, "human_handling")
      )!
    );
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(conversation.name, pattern),
        ilike(conversation.last_customer_message, pattern),
        ilike(conversation.escalation_summary, pattern),
        ilike(conversation.user_email, pattern),
        ilike(conversation.assigned_agent_name, pattern)
      )!
    );
  }

  return db
    .select()
    .from(conversation)
    .where(and(...conditions))
    .orderBy(desc(conversation.last_message_at))
    .limit(limit);
}

export async function countOpenEscalated(workspaceId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(conversation)
    .where(
      and(
        eq(conversation.workspace_id, workspaceId),
        eq(conversation.status, "escalated")
      )
    );
  return Number(row?.count ?? 0);
}
