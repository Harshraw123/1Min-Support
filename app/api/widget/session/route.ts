import { chatBotMetadata } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import crypto from "crypto";
import { db } from "@/db/client";
export async function POST(req: Request) {
  try {
    const { widgetId } = await req.json();
    if (!widgetId || typeof widgetId !== "string") {
      return NextResponse.json({ error: "Invalid widgetId" }, { status: 400 });
    }

    const [bot] = await db
      .select()
      .from(chatBotMetadata)
      .where(eq(chatBotMetadata.widget_id, widgetId))
      .limit(1);

    if (!bot) {
      return NextResponse.json({ error: "Chatbot not found" }, { status: 404 });
    }

    const origin = req.headers.get("origin");
    if (bot.allowed_domain && origin !== bot.allowed_domain) {
      return new NextResponse("Unauthorized domain", { status: 403 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
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
        helpText: "Powered by OneMinute Support",
      },
    });

    response.headers.set("Access-Control-Allow-Origin", bot.allowed_domain || "*");
    return response;
  } catch (error) {
    console.error("SESSION_ERROR", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}