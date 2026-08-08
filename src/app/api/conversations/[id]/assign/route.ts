import { NextRequest, NextResponse } from "next/server";
import {
  assignConversation,
  getConversationForOrg,
  requireOrgSession,
  resolveOrgAgent,
} from "@/lib/conversations";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Assign (or reassign) a conversation to a specific org member.
 * Target agent must belong to the same organization_id as the session.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireOrgSession();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as {
      agentId?: string;
      agentEmail?: string;
    };

    const existing = await getConversationForOrg({
      conversationId: id,
      organizationId: auth.ctx.organizationId,
    });
    if (!existing) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    const agent = await resolveOrgAgent({
      organizationId: auth.ctx.organizationId,
      agentId: body.agentId,
      agentEmail: body.agentEmail,
    });

    if (!agent || (!body.agentId && !body.agentEmail)) {
      return NextResponse.json(
        { message: "agentId or agentEmail is required and must belong to this workspace" },
        { status: 400 }
      );
    }

    // Reject pure email fallback that didn't match a team member when assigning others.
    if (
      agent.role === "owner" &&
      body.agentEmail &&
      body.agentEmail.trim().toLowerCase() !== auth.ctx.email.toLowerCase() &&
      !agent.id
    ) {
      return NextResponse.json(
        { message: "Target agent is not a member of this organization" },
        { status: 400 }
      );
    }

    const updated = await assignConversation({
      conversationId: id,
      workspaceId: auth.ctx.organizationId,
      agentId: agent.id,
      agentEmail: agent.email,
      agentName: agent.name,
      assignedByEmail: auth.ctx.email,
    });

    if (!updated) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error("[CONVERSATION_ASSIGN_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
