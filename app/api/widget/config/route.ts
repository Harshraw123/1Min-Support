import { db } from "@/db/client";
import { chatBotMetadata } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { sections } from "@/db/schema";

export async function GET(req: NextRequest) {
  const widgetId = req.nextUrl.searchParams.get("widgetId");
  if (!widgetId) {
    return NextResponse.json({ error: "Widget ID is required" }, { status: 400 });
  }

  try {
    const [meta] = await db
      .select()
      .from(chatBotMetadata)
      .where(eq(chatBotMetadata.widget_id, widgetId))
      .limit(1);

    if (!meta) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    const origin = req.headers.get("origin");
    if (meta.allowed_domain && origin !== meta.allowed_domain) {
      return new NextResponse("Unauthorized domain", { status: 403 });
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

    response.headers.set("Access-Control-Allow-Origin", meta.allowed_domain || "*");
    return response;
  } catch (error) {
    console.error("Widget Config Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}