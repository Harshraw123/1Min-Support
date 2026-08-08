import { NextRequest, NextResponse } from "next/server";
import {
  getConversationForOrg,
  requireOrgSession,
  resolveOrgAgent,
  takeConversation,
} from "@/lib/conversations";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Agent self-assignment ("Take conversation").
 * Uses conditional UPDATE so only one agent can win under concurrent clicks.
 */
export async function POST(_req: NextRequest, ctx: Ctx) {
  const auth = await requireOrgSession();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await ctx.params;
    const existing = await getConversationForOrg({
      conversationId: id,
      organizationId: auth.ctx.organizationId,
    });
    if (!existing) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    const agent = await resolveOrgAgent({
      organizationId: auth.ctx.organizationId,
      agentEmail: auth.ctx.email,
    });
    if (!agent) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const result = await takeConversation({
      conversationId: id,
      workspaceId: auth.ctx.organizationId,
      agentId: agent.id,
      agentEmail: agent.email,
      agentName: auth.ctx.name || agent.name,
    });

    if (!result.ok) {
      if (result.code === "ALREADY_ASSIGNED") {
        return NextResponse.json(
          {
            message: `Conversation already assigned to ${result.assignedTo || "another agent"}`,
            assignedTo: result.assignedTo,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation: result.conversation });
  } catch (error) {
    console.error("[CONVERSATION_TAKE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
