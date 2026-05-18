import { db } from "@/db/client";
import { chatBotMetadata, sections } from "@/db/schema";
import { getSession } from "@/lib/auth/getSession";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const user = await getSession();
    const workspaceId =
      typeof user?.organization_id === "string" && user.organization_id.trim()
        ? user.organization_id.trim()
        : null;
    if (!user || !workspaceId) {
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
    const requestedDefaultSectionId =
      typeof body?.defaultSectionId === "string" && body.defaultSectionId.trim()
        ? body.defaultSectionId.trim()
        : null;

    let defaultSectionId: string | null = null;
    if (requestedDefaultSectionId) {
      const [section] = await db
        .select({ id: sections.id })
        .from(sections)
        .where(
          and(
            eq(sections.id, requestedDefaultSectionId),
            eq(sections.chatbot_id, workspaceId),
            eq(sections.workspace_id, workspaceId)
          )
        )
        .limit(1);
      defaultSectionId = section?.id ?? null;
    }

    const [existing] = await db
      .select()
      .from(chatBotMetadata)
      .where(eq(chatBotMetadata.chatbot_id, workspaceId));

    if (existing) {
      const [updated] = await db
        .update(chatBotMetadata)
        .set({
          color: primaryColor,
          welcome_message: welcomeMessage,
          avatar_src: avatarSrc,
          default_section_id: defaultSectionId,
        })
        .where(eq(chatBotMetadata.chatbot_id, workspaceId))
        .returning();

      return NextResponse.json({
        data: {
          primaryColor: updated.color,
          welcomeMessage: updated.welcome_message,
          avatarSrc: updated.avatar_src,
          defaultSectionId: updated.default_section_id,
          widgetId: updated.widget_id,
        },
      });
    }

    const [created] = await db
      .insert(chatBotMetadata)
      .values({
        chatbot_id: workspaceId,
        color: primaryColor,
        welcome_message: welcomeMessage,
        avatar_src: avatarSrc,
        default_section_id: defaultSectionId,
        widget_id: crypto.randomUUID(),
      })
      .returning();

    return NextResponse.json({
      data: {
        primaryColor: created.color,
        welcomeMessage: created.welcome_message,
        avatarSrc: created.avatar_src,
        defaultSectionId: created.default_section_id,
        widgetId: created.widget_id,
      },
    });
  } catch (error) {
    console.error("METADATA_UPDATE_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
