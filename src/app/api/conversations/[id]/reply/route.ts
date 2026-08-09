import { NextRequest, NextResponse } from "next/server";
import {
  appendMessage,
  getConversationForOrg,
  getConversationMode,
  releaseConversationToAi,
  requireOrgSession,
  resolveOrgAgent,
  takeConversation,
} from "@/lib/conversations";
import { db } from "@/db/client";
import { conversation } from "@/db/schema";
import { and, eq } from "drizzle-orm";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Human agent reply to the customer.
 * Auto-takes if unassigned, persists the agent message, then releases the thread
 * back to AI so follow-up business questions are handled by the bot again.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireOrgSession();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as {
      message?: string;
      clientMessageId?: string;
      keepHuman?: boolean;
    };

    const content = typeof body.message === "string" ? body.message.trim() : "";
    if (!content) {
      return NextResponse.json({ message: "message is required" }, { status: 400 });
    }

    let conv = await getConversationForOrg({
      conversationId: id,
      organizationId: auth.ctx.organizationId,
    });
    if (!conv) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    const agent = await resolveOrgAgent({
      organizationId: auth.ctx.organizationId,
      agentEmail: auth.ctx.email,
    });
    if (!agent) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const myEmail = auth.ctx.email.toLowerCase();
    const assignee = conv.assigned_agent_email?.toLowerCase() || null;

    if (assignee && assignee !== myEmail) {
      return NextResponse.json(
        {
          message: `Conversation is assigned to ${conv.assigned_agent_name || assignee}`,
        },
        { status: 409 }
      );
    }

    if (!assignee) {
      const taken = await takeConversation({
        conversationId: id,
        workspaceId: auth.ctx.organizationId,
        agentId: agent.id,
        agentEmail: agent.email,
        agentName: auth.ctx.name || agent.name,
      });
      if (!taken.ok) {
        return NextResponse.json(
          {
            message: `Conversation already assigned to ${taken.assignedTo || "another agent"}`,
          },
          { status: 409 }
        );
      }
      conv = taken.conversation;
    } else {
      const [updated] = await db
        .update(conversation)
        .set({
          handling_mode: "HUMAN",
          status: "human_handling",
          resolved_at: null,
          resolved_by: null,
        })
        .where(
          and(
            eq(conversation.id, id),
            eq(conversation.workspace_id, auth.ctx.organizationId)
          )
        )
        .returning();
      if (updated) conv = updated;
    }

    const { message } = await appendMessage({
      conversationId: id,
      role: "agent",
      content,
      senderId: agent.id,
      senderEmail: agent.email,
      senderName: auth.ctx.name || agent.name,
      clientMessageId: body.clientMessageId?.trim() || null,
    });

    // Default: after the human answers, AI resumes follow-ups.
    // Pass keepHuman=true only when the agent must stay on the thread.
    if (!body.keepHuman) {
      const released = await releaseConversationToAi({
        conversationId: id,
        workspaceId: auth.ctx.organizationId,
        releasedBy: agent.email,
      });
      if (released) conv = released;
    }

    console.log("[CONVERSATION_STATE]", {
      conversationId: id,
      event: body.keepHuman ? "HUMAN_REPLY_KEEP" : "HUMAN_REPLY_RELEASE_TO_AI",
      newMode: getConversationMode(conv),
      agent: agent.email,
    });

    return NextResponse.json({
      message: {
        id: message.id,
        role: message.role,
        content: message.content,
        senderName: message.sender_name,
        createdAt: message.created_at,
      },
      conversation: conv,
    });
  } catch (error) {
    console.error("[CONVERSATION_REPLY_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
