import { chatBotMetadata } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import crypto from "crypto";
import { db } from "@/db/client";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

export async function POST(req: Request) {
  try {
    const { widgetId } = await req.json();
    if (!widgetId || typeof widgetId !== "string") {
      return withCors(NextResponse.json({ error: "Invalid widgetId" }, { status: 400 }));
    }

    const [bot] = await db
      .select()
      .from(chatBotMetadata)
      .where(eq(chatBotMetadata.widget_id, widgetId))
      .limit(1);

    if (!bot) {
      return withCors(NextResponse.json({ error: "Chatbot not found" }, { status: 404 }));
    }

    const origin = req.headers.get("origin");
    if (bot.allowed_domain && origin && origin !== bot.allowed_domain) {
      return withCors(new NextResponse("Unauthorized domain", { status: 403 }), bot.allowed_domain);
    }

    if (!process.env.JWT_SECRET) {
      return withCors(
        NextResponse.json({ error: "Widget session signing is not configured" }, { status: 500 }),
        bot.allowed_domain || origin
      );
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const sessionId = crypto.randomUUID();

    const token = await new SignJWT({
      widgetId: bot.widget_id,
      chatbotId: bot.chatbot_id,
      sessionId,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("2h")
      .sign(secret);

    const response = NextResponse.json({
      token,
      sessionId,
      config: {
        name: bot.name,
        welcomeMessage: bot.welcome_message,
        primaryColor: bot.color || "#000000",
        botImage: bot.avatar_src,
        defaultSectionId: bot.default_section_id,
        helpText: "Powered by OneMinute Support",
      },
    });

    return withCors(response, bot.allowed_domain || origin);
  } catch (error) {
    console.error("SESSION_ERROR", error);
    return withCors(new NextResponse("Internal Server Error", { status: 500 }));
  }
}
