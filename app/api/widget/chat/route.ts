import { db } from "@/db/client";
import { sections as sectionsTable } from "@/db/schema";
import { asc, eq } from "drizzle-orm";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { workspaceChatCompletion } from "@/lib/chat/workspaceChatCompletion";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function withCors(response: NextResponse, origin?: string | null) {
  response.headers.set("Access-Control-Allow-Origin", origin || "*");
  response.headers.set("Vary", "Origin");
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
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

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    let chatbotId: string | null = null;
    try {
      const { payload } = await jwtVerify(raw, secret, { algorithms: ["HS256"] });
      chatbotId =
        typeof payload.chatbotId === "string" && payload.chatbotId.trim()
          ? payload.chatbotId.trim()
          : null;
    } catch {
      return withCors(NextResponse.json({ error: "Invalid or expired session" }, { status: 401 }));
    }

    if (!chatbotId) {
      return withCors(NextResponse.json({ error: "Invalid token payload" }, { status: 401 }));
    }

    const { messages, knowledge_source_ids, section_id: bodySectionId } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return withCors(NextResponse.json({ error: "Invalid messages array" }, { status: 400 }));
    }

    let sectionId =
      typeof bodySectionId === "string" && bodySectionId.trim() ? bodySectionId.trim() : null;

    if (!sectionId) {
      const [first] = await db
        .select({ id: sectionsTable.id })
        .from(sectionsTable)
        .where(eq(sectionsTable.chatbot_id, chatbotId))
        .orderBy(asc(sectionsTable.created_at))
        .limit(1);
      sectionId = first?.id ?? null;
    }

    const origin = req.headers.get("origin");
    const result = await workspaceChatCompletion({
      workspaceId: chatbotId,
      messages: messages as { role: string; content: string }[],
      section_id: sectionId,
      knowledge_source_ids: Array.isArray(knowledge_source_ids) ? knowledge_source_ids : undefined,
    });

    return withCors(
      NextResponse.json({
        message: result.message,
        tokensUsed: result.tokensUsed,
      }),
      origin
    );
  } catch (error) {
    console.error("[WIDGET_CHAT_ERROR]", error);
    const msg = error instanceof Error ? error.message : "";
    if (msg === "Invalid messages array") {
      return withCors(NextResponse.json({ error: msg }, { status: 400 }));
    }
    if (msg === "No response generated") {
      return withCors(NextResponse.json({ error: "No response generated. Please retry." }, { status: 502 }));
    }
    if (msg === "GROQ_API_KEY is not configured") {
      return withCors(NextResponse.json({ error: "Chat is not configured" }, { status: 503 }));
    }
    return withCors(new NextResponse("Internal Server Error", { status: 500 }));
  }
}
