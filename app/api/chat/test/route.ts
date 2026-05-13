import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/getSession";
import { workspaceChatCompletion } from "@/lib/chat/workspaceChatCompletion";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    const userEmail = user?.email?.trim() || user?.user?.email?.trim();
    const workspaceId =
      typeof user?.organization_id === "string" && user.organization_id.trim()
        ? user.organization_id.trim()
        : null;

    if (!userEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!workspaceId) {
      return NextResponse.json(
        { error: "Missing workspace context (organization_id)" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { knowledge_source_ids, section_id } = body ?? {};
    const { messages } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Invalid messages array" }, { status: 400 });
    }

    const result = await workspaceChatCompletion({
      workspaceId,
      messages,
      section_id,
      knowledge_source_ids,
    });

    return NextResponse.json({
      message: result.message,
      tokensUsed: result.tokensUsed,
    });
  } catch (error) {
    console.error("[CHAT_ERROR]", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Invalid messages array") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg === "No response generated") {
      return NextResponse.json({ error: "No response generated. Please retry." }, { status: 502 });
    }
    if (msg === "GROQ_API_KEY is not configured") {
      return NextResponse.json({ error: "Chat is not configured" }, { status: 503 });
    }
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
