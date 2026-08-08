import { NextRequest, NextResponse } from "next/server";
import {
  getConversationForOrg,
  listMessages,
  requireOrgSession,
  stripEscalationMarkers,
} from "@/lib/conversations";
import { normalizeConversationStatus } from "@/lib/conversations/types";

type Ctx = { params: Promise<{ id: string }> };

/** Load one conversation thread for the session workspace (includes full message history). */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const auth = await requireOrgSession();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await ctx.params;
    const conv = await getConversationForOrg({
      conversationId: id,
      organizationId: auth.ctx.organizationId,
    });

    if (!conv) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    const msgs = await listMessages(conv.id);

    return NextResponse.json({
      conversation: {
        id: conv.id,
        status: normalizeConversationStatus(conv.status),
        handlingMode: conv.handling_mode,
        name: conv.name,
        visitorId: conv.visitor_id,
        lastCustomerMessage: conv.last_customer_message,
        escalationReason: conv.escalation_reason,
        escalationSummary: conv.escalation_summary,
        escalatedAt: conv.escalated_at,
        escalatedBy: conv.escalated_by,
        priority: conv.priority,
        assignedAgentId: conv.assigned_agent_id,
        assignedAgentEmail: conv.assigned_agent_email,
        assignedAgentName: conv.assigned_agent_name,
        assignedAt: conv.assigned_at,
        resolvedAt: conv.resolved_at,
        resolvedBy: conv.resolved_by,
        sectionId: conv.section_id,
        lastMessageAt: conv.last_message_at,
        createdAt: conv.created_at,
      },
      messages: msgs.map((m) => ({
        id: m.id,
        role: m.role,
        content:
          m.role === "assistant" ? stripEscalationMarkers(m.content) : m.content,
        senderId: m.sender_id,
        senderEmail: m.sender_email,
        senderName: m.sender_name,
        createdAt: m.created_at,
        metadata: m.metadata,
      })),
    });
  } catch (error) {
    console.error("[CONVERSATION_GET_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
