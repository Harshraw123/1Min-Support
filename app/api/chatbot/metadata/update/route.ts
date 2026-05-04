import { db } from "@/db/client";
import { chatBotMetadata } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const user = await getSession();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const primaryColor =
      typeof body?.primaryColor === "string" && body.primaryColor.trim()
        ? body.primaryColor.trim()
        : "#111827";
    const welcomeMessage =
      typeof body?.welcomeMessage === "string" && body.welcomeMessage.trim()
        ? body.welcomeMessage.trim()
        : "Hi there, How can I help you today?";
    const avatarSrc =
      typeof body?.avatarSrc === "string" && body.avatarSrc.trim() ? body.avatarSrc.trim() : null;

    const [existing] = await db
      .select()
      .from(chatBotMetadata)
      .where(eq(chatBotMetadata.user_email, user.email));

    if (existing) {
      const [updated] = await db
        .update(chatBotMetadata)
        .set({
          color: primaryColor,
          welcome_message: welcomeMessage,
          avatar_src: avatarSrc,
        })
        .where(eq(chatBotMetadata.user_email, user.email))
        .returning();

      return NextResponse.json({
        data: {
          primaryColor: updated.color,
          welcomeMessage: updated.welcome_message,
          avatarSrc: updated.avatar_src,
          widgetId: updated.widget_id,
        },
      });
    }

    const [created] = await db
      .insert(chatBotMetadata)
      .values({
        user_email: user.email,
        color: primaryColor,
        welcome_message: welcomeMessage,
        avatar_src: avatarSrc,
        widget_id: crypto.randomUUID(),
      })
      .returning();

    return NextResponse.json({
      data: {
        primaryColor: created.color,
        welcomeMessage: created.welcome_message,
        avatarSrc: created.avatar_src,
        widgetId: created.widget_id,
      },
    });
  } catch (error) {
    console.error("METADATA_UPDATE_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}