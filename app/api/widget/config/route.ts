import { db } from "@/db/client";
import { chatBotMetadata } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { sections } from "@/db/schema";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
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

export async function GET(req: NextRequest) {
  const widgetId = req.nextUrl.searchParams.get("widgetId");
  if (!widgetId) {
    return withCors(NextResponse.json({ error: "Widget ID is required" }, { status: 400 }));
  }

  try {
    const [meta] = await db
      .select()
      .from(chatBotMetadata)
      .where(eq(chatBotMetadata.widget_id, widgetId))
      .limit(1);

    if (!meta) {
      return withCors(NextResponse.json({ error: "Bot not found" }, { status: 404 }));
    }

    const origin = req.headers.get("origin");
    if (meta.allowed_domain && origin && origin !== meta.allowed_domain) {
      return withCors(new NextResponse("Unauthorized domain", { status: 403 }), meta.allowed_domain);
    }

    const userSections = await db
      .select()
      .from(sections)
      .where(eq(sections.chatbot_id, meta.chatbot_id));

    const response = NextResponse.json({
      config: {
        welcomeMessage: meta.welcome_message,
        primaryColor: meta.color,
        businessName: meta.name,
        botImage: meta.avatar_src,
      },
      sections: userSections,
    });

    return withCors(response, meta.allowed_domain || origin);
  } catch (error) {
    console.error("Widget Config Error:", error);
    return withCors(NextResponse.json({ error: "Internal Server Error" }, { status: 500 }));
  }
}
