import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { workspaceChatCompletion } from "@/lib/chat/workspaceChatCompletion";
import { detectEscalation, stripEscalationMarkers } from "@/lib/conversations";

export async function POST(req: NextRequest) {
  // Dashboard test chat logged-in workspace context me shared AI flow chalata hai.
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
      billable: false,
      surface: "dashboard_test",
    });

    const lastUser =
      [...messages]
        .reverse()
        .find(
          (m: { role?: string; content?: string }) =>
            m?.role === "user" && typeof m.content === "string" && m.content.trim()
        )?.content?.trim() ?? "";

    // Same marker handling as production widget — never show [[ESCALATE|...]] in the simulator.
    const signal = detectEscalation({
      userMessage: lastUser,
      aiMessage: result.message,
      fallbackBehavior: result.sectionFallbackBehavior,
      usedRag: result.retrieval?.usedRag,
      hadKnowledgeSources: result.retrieval?.hadKnowledgeSources,
    });

    return NextResponse.json({
      message: stripEscalationMarkers(signal.customerMessage),
      tokensUsed: result.tokensUsed,
      wouldEscalate: signal.shouldEscalate,
      escalationReason: signal.shouldEscalate ? signal.reason : null,
      scopeDeclined: signal.scopeDeclined === true,
    });
  } catch (error) {
    console.error("[CHAT_TEST_ERROR]", error);
    const msg = error instanceof Error ? error.message : "Internal Server Error";
    if (msg === "Invalid messages array") {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    if (msg === "No response generated") {
      return NextResponse.json({ error: "No response generated. Please retry." }, { status: 502 });
    }
    if (msg === "GROQ_API_KEY is not configured") {
      return NextResponse.json({ error: "Chat is not configured (GROQ_API_KEY missing)" }, { status: 503 });
    }
    return NextResponse.json(
      {
        error: msg || "Internal Server Error",
        details: process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
