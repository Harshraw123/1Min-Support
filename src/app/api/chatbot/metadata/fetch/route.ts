import { db } from "@/db/client";
import { chatBotMetadata } from "@/db/schema";
import { getSession } from "@/lib/auth/getSession";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const user = await getSession();
    const workspaceId =
      typeof user?.organization_id === "string" && user.organization_id.trim()
        ? user.organization_id.trim()
        : null;

    if (!user || !workspaceId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [record] = await db
      .select()
      .from(chatBotMetadata)
      .where(eq(chatBotMetadata.chatbot_id, workspaceId));

    if (!record) {
      return NextResponse.json(
        {
          exists: false,
          data: null,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      exists: true,
      data: {
        primaryColor: record.color ?? "#111827",
        welcomeMessage: record.welcome_message ?? "Hi there, How can I help you today?",
        avatarSrc: record.avatar_src ?? null,
        defaultSectionId: record.default_section_id ?? null,
        widgetId: record.widget_id ?? null,
      },
    });

  } catch (error) {
    console.error("[METADATA_FETCH_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}
