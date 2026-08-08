import { NextRequest, NextResponse } from "next/server";
import {
  getConversationForOrg,
  requireOrgSession,
  resolveConversation,
} from "@/lib/conversations";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Mark conversation resolved. Does not trigger an AI reply.
 * Customer messaging later reopens via widget chat (prefer AI unless preferHuman).
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

    const updated = await resolveConversation({
      conversationId: id,
      workspaceId: auth.ctx.organizationId,
      resolvedBy: auth.ctx.email,
    });

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error("[CONVERSATION_RESOLVE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
