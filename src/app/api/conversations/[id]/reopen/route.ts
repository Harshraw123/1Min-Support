import { NextRequest, NextResponse } from "next/server";
import {
  getConversationForOrg,
  reopenConversation,
  requireOrgSession,
} from "@/lib/conversations";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Reopen a resolved conversation into the queue.
 * preferHuman=true keeps/restores human handling; otherwise returns to AI.
 */
export async function POST(req: NextRequest, ctx: Ctx) {
  const auth = await requireOrgSession();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => ({}))) as { preferHuman?: boolean };

    const existing = await getConversationForOrg({
      conversationId: id,
      organizationId: auth.ctx.organizationId,
    });
    if (!existing) {
      return NextResponse.json({ message: "Conversation not found" }, { status: 404 });
    }

    const updated = await reopenConversation({
      conversationId: id,
      workspaceId: auth.ctx.organizationId,
      reopenedBy: auth.ctx.email,
      preferHuman: Boolean(body.preferHuman),
    });

    return NextResponse.json({ conversation: updated });
  } catch (error) {
    console.error("[CONVERSATION_REOPEN_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
