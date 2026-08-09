import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sections as sectionsTable } from "@/db/schema";
import { workspaceChatCompletion } from "@/lib/chat/workspaceChatCompletion";
import {
  checkAiMessageQuota,
  incrementAiMessageUsage,
} from "@/lib/billing/checkUsageLimit";
import {
  alreadyEscalatedCustomerNote,
  appendMessage,
  classifyCustomerTurn,
  detectEscalation,
  ensureUserFacingMessage,
  escalateConversation,
  escalationWaitingAcknowledgement,
  getConversationMode,
  getOrCreateConversation,
  humanActiveStatusMessage,
  isEscalationBoilerplateOnly,
  listMessages,
  offlineEscalationCustomerMessage,
  refreshConversationAiEligibility,
  reopenConversation,
  scopeDeclineMessage,
  shouldAiAssistWhileEscalated,
  stripEscalationMarkers,
  stripOfflineQueueBoilerplate,
} from "@/lib/conversations";
import { normalizeConversationStatus } from "@/lib/conversations/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response: NextResponse, origin?: string | null) {
  // Widget external sites se call hota hai, isliye CORS headers response par attach hote hain.
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Vary", "Origin");
  return response;
}

type WidgetJwt = {
  chatbotId: string;
  widgetId?: string;
  sessionId?: string;
};

async function verifyWidgetToken(raw: string): Promise<WidgetJwt | null> {
  // Tenant identity comes only from the signed JWT (chatbotId), never from client body fields.
  if (!process.env.JWT_SECRET) return null;
  const secret = new TextEncoder().encode(process.env.JWT_SECRET);
  try {
    const { payload } = await jwtVerify(raw, secret, { algorithms: ["HS256"] });
    const chatbotId =
      typeof payload.chatbotId === "string" && payload.chatbotId.trim()
        ? payload.chatbotId.trim()
        : null;
    if (!chatbotId) return null;
    return {
      chatbotId,
      widgetId: typeof payload.widgetId === "string" ? payload.widgetId : undefined,
      sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
    };
  } catch {
    return null;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  /**
   * Public widget chat:
   * 1) Verify JWT → tenant (chatbotId / workspace)
   * 2) Persist/reuse conversation + customer message
   * 3) If human-owned → store customer turn and return non-empty acknowledgement/status
   * 4) Else run shared RAG completion, re-check ownership before deliver
   * 5) Escalate into persistent queue when AI cannot resolve
   */
  try {
    const auth = req.headers.get("authorization");
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    const raw =
      bearer ||
      (typeof body.token === "string" && body.token.trim() ? body.token.trim() : "");

    if (!raw) {
      return withCors(NextResponse.json({ error: "Missing bearer token" }, { status: 401 }));
    }

    if (!process.env.JWT_SECRET) {
      return withCors(NextResponse.json({ error: "Widget auth is not configured" }, { status: 500 }));
    }

    const jwt = await verifyWidgetToken(raw);
    if (!jwt) {
      return withCors(NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }));
    }

    const chatbotId = jwt.chatbotId;
    const workspaceId = chatbotId;

    const messageText =
      typeof body.message === "string" && body.message.trim()
        ? body.message.trim()
        : null;

    // Backward compatible: accept full messages[] from older embed clients.
    let userContent = messageText;
    if (!userContent && Array.isArray(body.messages)) {
      for (let i = body.messages.length - 1; i >= 0; i -= 1) {
        const turn = body.messages[i] as { role?: string; content?: string };
        if (turn?.role === "user" && typeof turn.content === "string" && turn.content.trim()) {
          userContent = turn.content.trim();
          break;
        }
      }
    }

    if (!userContent) {
      return withCors(NextResponse.json({ error: "Message is required" }, { status: 400 }));
    }

    const clientMessageId =
      typeof body.clientMessageId === "string" && body.clientMessageId.trim()
        ? body.clientMessageId.trim()
        : null;
    const visitorId =
      typeof body.visitorId === "string" && body.visitorId.trim()
        ? body.visitorId.trim()
        : null;
    const conversationIdInput =
      typeof body.conversationId === "string" && body.conversationId.trim()
        ? body.conversationId.trim()
        : null;

    let sectionId =
      typeof body.section_id === "string" && body.section_id.trim()
        ? body.section_id.trim()
        : null;

    if (!sectionId) {
      const [first] = await db
        .select({ id: sectionsTable.id })
        .from(sectionsTable)
        .where(eq(sectionsTable.chatbot_id, chatbotId))
        .orderBy(desc(sectionsTable.created_at))
        .limit(1);
      sectionId = first?.id ?? null;
    }

    const origin = req.headers.get("origin");
    const visitorIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      null;

    let conv = await getOrCreateConversation({
      chatbotId,
      workspaceId,
      conversationId: conversationIdInput,
      visitorId,
      widgetSessionId: jwt.sessionId ?? null,
      visitorIp,
      sectionId,
    });

    // Customer messaging a resolved thread → reopen (do not create a duplicate conversation).
    if (
      normalizeConversationStatus(conv.status) === "resolved" ||
      conv.status === "closed"
    ) {
      const reopened = await reopenConversation({
        conversationId: conv.id,
        workspaceId,
        reopenedBy: "customer",
        preferHuman: false,
      });
      if (reopened) conv = reopened;
    }

    const { message: userMessage, created: userCreated } = await appendMessage({
      conversationId: conv.id,
      role: "user",
      content: userContent,
      clientMessageId,
    });

    // Idempotent retry that already produced an assistant reply — return last assistant turn.
    if (!userCreated && clientMessageId) {
      const history = await listMessages(conv.id);
      const userIdx = history.findIndex((m) => m.id === userMessage.id);
      const maybeAssistant = userIdx >= 0 ? history[userIdx + 1] : null;
      if (maybeAssistant && maybeAssistant.role === "assistant") {
        return withCors(
          NextResponse.json({
            conversationId: conv.id,
            message: ensureUserFacingMessage(maybeAssistant.content),
            messageRole: "assistant",
            messageId: maybeAssistant.id,
            handlingMode: conv.handling_mode,
            conversationMode: getConversationMode(conv),
            status: conv.status,
            escalated: conv.handling_mode === "HUMAN",
            aiResponded: true,
          }),
          origin
        );
      }

      const retryEligibility = await refreshConversationAiEligibility(conv.id, workspaceId);
      if (!retryEligibility.eligible) {
        const mode = retryEligibility.mode;
        const message = retryEligibility.needsAcknowledgement
          ? escalationWaitingAcknowledgement(
              "I've added your latest message to the conversation."
            )
          : humanActiveStatusMessage();
        return withCors(
          NextResponse.json({
            conversationId: conv.id,
            message,
            messageRole: retryEligibility.needsAcknowledgement ? "assistant" : "system",
            messageId: userMessage.id,
            handlingMode: retryEligibility.conversation?.handling_mode ?? conv.handling_mode,
            conversationMode: mode,
            status: retryEligibility.conversation?.status ?? conv.status,
            escalated: mode !== "AI_ACTIVE",
            aiResponded: false,
            waitingForAgent: mode === "ESCALATED_WAITING_FOR_HUMAN",
            idempotentRetry: true,
          }),
          origin
        );
      }
    }

    const initialEligibility = await refreshConversationAiEligibility(conv.id, workspaceId);
    const turnKind = classifyCustomerTurn(userContent);
    const alreadyWaitingForHuman =
      initialEligibility.mode === "ESCALATED_WAITING_FOR_HUMAN";
    const humanActive = initialEligibility.mode === "HUMAN_ACTIVE";

    // Fast path: off-topic / gibberish never burns quota or opens a ticket.
    if (
      turnKind === "scope_decline" &&
      (initialEligibility.eligible || alreadyWaitingForHuman)
    ) {
      const decline = scopeDeclineMessage();
      const { message: assistantMsg } = await appendMessage({
        conversationId: conv.id,
        role: "assistant",
        content: decline,
        metadata: { type: "scope_decline", turnKind },
      });
      return withCors(
        NextResponse.json({
          conversationId: conv.id,
          message: decline,
          messageRole: "assistant",
          messageId: assistantMsg.id,
          handlingMode: initialEligibility.conversation?.handling_mode ?? conv.handling_mode,
          conversationMode: initialEligibility.mode,
          status: initialEligibility.conversation?.status ?? conv.status,
          escalated: alreadyWaitingForHuman,
          aiResponded: true,
          waitingForAgent: alreadyWaitingForHuman,
          scopeDeclined: true,
        }),
        origin
      );
    }

    // Human actively handling (assigned) → AI stays silent until agent replies (then released to AI).
    if (humanActive) {
      const statusMessage = humanActiveStatusMessage();
      return withCors(
        NextResponse.json({
          conversationId: conv.id,
          message: statusMessage,
          messageRole: "system",
          messageId: userMessage.id,
          handlingMode: initialEligibility.conversation?.handling_mode ?? "HUMAN",
          conversationMode: initialEligibility.mode,
          status: initialEligibility.conversation?.status ?? conv.status,
          escalated: true,
          aiResponded: false,
          waitingForAgent: false,
        }),
        origin
      );
    }

    // Queued for a human: waiting/status pings stay as acknowledgements.
    // Other business questions are allowed to hit AI (hybrid assist).
    if (alreadyWaitingForHuman && !shouldAiAssistWhileEscalated(turnKind)) {
      const acknowledgement = escalationWaitingAcknowledgement(
        turnKind === "request_human"
          ? "A teammate will take this as soon as they're available."
          : "I've added your latest message to the conversation."
      );
      const { message: assistantMsg } = await appendMessage({
        conversationId: conv.id,
        role: "assistant",
        content: acknowledgement,
        metadata: { type: "escalation_waiting_acknowledgement", turnKind },
      });
      return withCors(
        NextResponse.json({
          conversationId: conv.id,
          message: ensureUserFacingMessage(assistantMsg.content, acknowledgement),
          messageRole: "assistant",
          messageId: assistantMsg.id,
          handlingMode: initialEligibility.conversation?.handling_mode ?? "HUMAN",
          conversationMode: initialEligibility.mode,
          status: initialEligibility.conversation?.status ?? conv.status,
          escalated: true,
          aiResponded: false,
          waitingForAgent: true,
        }),
        origin
      );
    }

    // AI_ACTIVE, or escalated-waiting with an AI-assistable turn → continue to Groq.
    if (!initialEligibility.eligible && !alreadyWaitingForHuman) {
      const mode = initialEligibility.mode;
      const statusMessage = humanActiveStatusMessage();
      return withCors(
        NextResponse.json({
          conversationId: conv.id,
          message: statusMessage,
          messageRole: "system",
          messageId: userMessage.id,
          handlingMode: initialEligibility.conversation?.handling_mode ?? "HUMAN",
          conversationMode: mode,
          status: initialEligibility.conversation?.status ?? conv.status,
          escalated: mode !== "AI_ACTIVE",
          aiResponded: false,
          waitingForAgent: mode === "ESCALATED_WAITING_FOR_HUMAN",
        }),
        origin
      );
    }

    // Abuse protection: block new AI generations when monthly quota is exhausted.
    // Customer message is already saved so nothing is lost.
    const quota = await checkAiMessageQuota({
      workspace_id: workspaceId,
      enforce: true,
    });
    if (!quota.allowed) {
      const limitMessage =
        "We've hit our AI reply limit for this month. Please try again later, or leave your message — our team can still follow up.";
      const { message: assistantMsg } = await appendMessage({
        conversationId: conv.id,
        role: "assistant",
        content: limitMessage,
        metadata: {
          type: "quota_exceeded",
          used: quota.used,
          limit: quota.limit,
          planSlug: quota.planSlug,
        },
      });
      return withCors(
        NextResponse.json({
          conversationId: conv.id,
          message: assistantMsg.content,
          messageId: assistantMsg.id,
          handlingMode: "AI",
          conversationMode: "AI_ACTIVE",
          status: conv.status,
          escalated: false,
          aiResponded: true,
          waitingForAgent: false,
          quotaExceeded: true,
          error: quota.reason,
        }),
        origin
      );
    }

    const history = await listMessages(conv.id);
    // Never feed leaked markers (or system/agent turns) back into the model prompt.
    // While queued, also neutralize prior handoff boilerplate so the model answers
    // the new product question instead of copying "noted for support…".
    const completionMessages = history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => {
        if (m.role !== "assistant") {
          return { role: m.role, content: m.content };
        }
        let content = stripOfflineQueueBoilerplate(m.content);
        if (alreadyWaitingForHuman && isEscalationBoilerplateOnly(content)) {
          content =
            "An earlier request was placed in the support queue. Continue helping with new product questions from CONTEXT.";
        }
        return { role: m.role, content };
      });

    let result;
    try {
      result = await workspaceChatCompletion({
        workspaceId: chatbotId,
        messages: completionMessages,
        section_id: sectionId,
        knowledge_source_ids: Array.isArray(body.knowledge_source_ids)
          ? (body.knowledge_source_ids as string[])
          : undefined,
        billable: true,
        surface: "widget",
        conversation_id: conv.id,
        message_id: userMessage.id,
        // Already queued → answer new product questions; don't re-escalate.
        assistWhileEscalated: alreadyWaitingForHuman,
      });
    } catch (error) {
      console.error("[WIDGET_CHAT_AI_ERROR]", error);
      const fallback =
        "I'm having trouble answering right now. I've saved your message so our support team can follow up.";
      await escalateConversation({
        conversationId: conv.id,
        workspaceId,
        reason: "TECHNICAL_ISSUE",
        summary: `AI failure while handling: "${userContent.slice(0, 200)}"`,
        escalatedBy: "SYSTEM",
        customerMessage: userContent,
        priority: "HIGH",
      });
      const { message: assistantMsg } = await appendMessage({
        conversationId: conv.id,
        role: "assistant",
        content: offlineEscalationCustomerMessage(fallback),
        metadata: { type: "ai_failure_escalation" },
      });
      return withCors(
        NextResponse.json({
          conversationId: conv.id,
          message: stripEscalationMarkers(assistantMsg.content),
          messageId: assistantMsg.id,
          handlingMode: "HUMAN",
          conversationMode: "ESCALATED_WAITING_FOR_HUMAN",
          status: "escalated",
          escalated: true,
          aiResponded: true,
          waitingForAgent: true,
        }),
        origin
      );
    }

    // Race: agent may have taken ownership while the model was generating.
    // Hybrid assist while queued is intentional — still deliver the AI answer.
    const eligibility = await refreshConversationAiEligibility(conv.id, workspaceId);
    const hybridAssistOk =
      eligibility.mode === "ESCALATED_WAITING_FOR_HUMAN" &&
      shouldAiAssistWhileEscalated(turnKind);

    if (!eligibility.eligible && !hybridAssistOk) {
      const mode = eligibility.mode;
      if (eligibility.needsAcknowledgement) {
        const acknowledgement = escalationWaitingAcknowledgement(
          "I've added your latest message to the conversation."
        );
        const { message: assistantMsg } = await appendMessage({
          conversationId: conv.id,
          role: "assistant",
          content: acknowledgement,
          metadata: { type: "escalation_waiting_acknowledgement", discardedAiResponse: true },
        });
        return withCors(
          NextResponse.json({
            conversationId: conv.id,
            message: ensureUserFacingMessage(assistantMsg.content, acknowledgement),
            messageRole: "assistant",
            messageId: assistantMsg.id,
            handlingMode: eligibility.conversation?.handling_mode ?? "HUMAN",
            conversationMode: mode,
            status: eligibility.conversation?.status ?? "escalated",
            escalated: true,
            aiResponded: false,
            waitingForAgent: true,
            discardedAiResponse: true,
          }),
          origin
        );
      }

      const statusMessage = humanActiveStatusMessage();
      return withCors(
        NextResponse.json({
          conversationId: conv.id,
          message: statusMessage,
          messageRole: "system",
          messageId: userMessage.id,
          handlingMode: eligibility.conversation?.handling_mode ?? "HUMAN",
          conversationMode: mode,
          status: eligibility.conversation?.status ?? "human_handling",
          escalated: mode !== "AI_ACTIVE",
          aiResponded: false,
          waitingForAgent: mode === "ESCALATED_WAITING_FOR_HUMAN",
          discardedAiResponse: true,
        }),
        origin
      );
    }

    const signal = detectEscalation({
      userMessage: userContent,
      aiMessage: result.message,
      fallbackBehavior: result.sectionFallbackBehavior,
      usedRag: result.retrieval?.usedRag,
      hadKnowledgeSources: result.retrieval?.hadKnowledgeSources,
    });

    // Defense in depth: never persist/return [[ESCALATE|...]] to customers.
    // Also strip the recurring offline-queue suffix so hybrid answers stay clean.
    let customerFacing = ensureUserFacingMessage(
      stripOfflineQueueBoilerplate(signal.customerMessage),
      "I couldn't generate a complete answer, but I've saved your message."
    );
    let escalated = false;
    let status = eligibility.conversation?.status ?? conv.status;
    let handlingMode = eligibility.conversation?.handling_mode ?? "AI";
    let conversationMode = getConversationMode(eligibility.conversation ?? conv);
    let waitingForAgent = false;

    const stillQueued =
      alreadyWaitingForHuman || eligibility.mode === "ESCALATED_WAITING_FOR_HUMAN";

    if (signal.shouldEscalate) {
      if (stillQueued) {
        // Already in the human queue — never open a duplicate ticket.
        // Prefer a real AI product answer when we have one; only fall back to a note
        // when the model produced pure handoff boilerplate (or user asked for a human).
        if (signal.reason === "CUSTOMER_REQUESTED_HUMAN" || turnKind === "request_human") {
          customerFacing = escalationWaitingAcknowledgement(
            "A teammate will take this as soon as they're available."
          );
        } else if (isEscalationBoilerplateOnly(customerFacing)) {
          customerFacing = alreadyEscalatedCustomerNote();
        } else {
          // Keep the stripped AI answer (e.g. product details from knowledge).
          customerFacing = ensureUserFacingMessage(
            stripOfflineQueueBoilerplate(customerFacing)
          );
        }
        escalated = true;
        waitingForAgent = true;
        status = eligibility.conversation?.status ?? "escalated";
        handlingMode = "HUMAN";
        conversationMode = "ESCALATED_WAITING_FOR_HUMAN";
      } else {
        const escalatedRow = await escalateConversation({
          conversationId: conv.id,
          workspaceId,
          reason: signal.reason,
          summary: signal.summary,
          escalatedBy: signal.reason === "CUSTOMER_REQUESTED_HUMAN" ? "CUSTOMER" : "AI",
          customerMessage: userContent,
        });
        customerFacing = offlineEscalationCustomerMessage(customerFacing);
        escalated = true;
        waitingForAgent = true;
        status = escalatedRow.status;
        handlingMode = escalatedRow.handling_mode;
        conversationMode = getConversationMode(escalatedRow);
      }
    } else if (stillQueued) {
      // Answered while queued — stay escalated so the original human request remains open.
      customerFacing = stripOfflineQueueBoilerplate(customerFacing);
      if (isEscalationBoilerplateOnly(customerFacing)) {
        customerFacing = alreadyEscalatedCustomerNote();
      }
      escalated = true;
      waitingForAgent = true;
      status = eligibility.conversation?.status ?? "escalated";
      handlingMode = eligibility.conversation?.handling_mode ?? "HUMAN";
      conversationMode = "ESCALATED_WAITING_FOR_HUMAN";
    } else {
      customerFacing = stripOfflineQueueBoilerplate(customerFacing);
    }

    const { message: assistantMsg } = await appendMessage({
      conversationId: conv.id,
      role: "assistant",
      content: ensureUserFacingMessage(stripOfflineQueueBoilerplate(customerFacing)),
      metadata: {
        usedRag: result.retrieval?.usedRag ?? false,
        escalated,
        escalationReason: escalated && signal.shouldEscalate ? signal.reason : undefined,
        scopeDeclined: signal.scopeDeclined === true,
        hybridAssist: stillQueued,
        turnKind,
      },
    });

    // Count only successful billable AI replies (after Groq + persist).
    await incrementAiMessageUsage(workspaceId, 1).catch((error) => {
      console.error("[AI_USAGE_INCREMENT_ERROR]", error);
    });

    return withCors(
      NextResponse.json({
        conversationId: conv.id,
        message: ensureUserFacingMessage(assistantMsg.content),
        messageRole: "assistant",
        messageId: assistantMsg.id,
        handlingMode,
        conversationMode,
        status,
        escalated,
        aiResponded: true,
        waitingForAgent,
        scopeDeclined: signal.scopeDeclined === true,
      }),
      origin
    );
  } catch (error) {
    console.error("[WIDGET_CHAT_ERROR]", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Invalid messages array" || msg === "Message content is required") {
      return withCors(NextResponse.json({ error: msg }, { status: 400 }));
    }
    if (msg === "No response generated") {
      return withCors(
        NextResponse.json({ error: "No response generated. Please retry." }, { status: 502 })
      );
    }
    if (msg === "GROQ_API_KEY is not configured") {
      return withCors(NextResponse.json({ error: "Chat is not configured" }, { status: 503 }));
    }
    return withCors(new NextResponse("Internal Server Error", { status: 500 }));
  }
}
