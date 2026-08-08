import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import {
  findConversation,
  getConversationMode,
  listMessages,
  stripEscalationMarkers,
} from "@/lib/conversations";
import { normalizeConversationStatus } from "@/lib/conversations/types";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response: NextResponse, origin?: string | null) {
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Vary", "Origin");
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Resume an existing widget conversation after refresh.
 * Tenant comes from JWT chatbotId — client cannot pick another workspace.
 * Does not create conversations (chat POST owns creation).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const bearer = auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    // Prefer Authorization header — query-string tokens can leak via logs/Referer.
    const token = bearer || "";

    if (!token) {
      return withCors(NextResponse.json({ error: "Missing bearer token" }, { status: 401 }));
    }
    if (!process.env.JWT_SECRET) {
      return withCors(
        NextResponse.json({ error: "Widget auth is not configured" }, { status: 500 })
      );
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    let chatbotId: string | null = null;
    try {
      const { payload } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
      chatbotId =
        typeof payload.chatbotId === "string" && payload.chatbotId.trim()
          ? payload.chatbotId.trim()
          : null;
    } catch {
      return withCors(
        NextResponse.json({ error: "Invalid or expired session" }, { status: 401 })
      );
    }

    if (!chatbotId) {
      return withCors(NextResponse.json({ error: "Invalid token payload" }, { status: 401 }));
    }

    const conversationId = req.nextUrl.searchParams.get("conversationId")?.trim() || null;
    const visitorId = req.nextUrl.searchParams.get("visitorId")?.trim() || null;
    const origin = req.headers.get("origin");

    if (!conversationId && !visitorId) {
      return withCors(NextResponse.json({ conversation: null, messages: [] }), origin);
    }

    const conv = await findConversation({
      chatbotId,
      workspaceId: chatbotId,
      conversationId,
      visitorId,
      includeResolved: true,
    });

    if (!conv) {
      return withCors(NextResponse.json({ conversation: null, messages: [] }), origin);
    }

    const msgs = await listMessages(conv.id);
    const conversationMode = getConversationMode(conv);

    // Customers must not see internal system events (escalation reason codes, assignment notes).
    const publicMessages = msgs.filter(
      (m) => m.role === "user" || m.role === "assistant" || m.role === "agent"
    );

    return withCors(
      NextResponse.json({
        conversation: {
          id: conv.id,
          status: normalizeConversationStatus(conv.status),
          handlingMode: conv.handling_mode,
          conversationMode,
          escalated:
            conversationMode === "ESCALATED_WAITING_FOR_HUMAN" ||
            conversationMode === "HUMAN_ACTIVE",
          assignedAgentName: conv.assigned_agent_name,
          lastCustomerMessage: conv.last_customer_message,
        },
        messages: publicMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content:
            m.role === "assistant" ? stripEscalationMarkers(m.content) : m.content,
          senderName: m.role === "agent" ? m.sender_name : null,
          createdAt: m.created_at,
        })),
      }),
      origin
    );
  } catch (error) {
    console.error("[WIDGET_CONVERSATION_GET_ERROR]", error);
    return withCors(new NextResponse("Internal Server Error", { status: 500 }));
  }
}
