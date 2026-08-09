import { db } from "@/db/client";
import { chatBotMetadata, sections } from "@/db/schema";
import { getSession } from "@/lib/auth/getSession";
import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const DEFAULT_PRIMARY_COLOR = "#111827";
const DEFAULT_WELCOME_MESSAGE = "Hi there, How can I help you today?";
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

function normalizeColor(value: unknown) {
  if (typeof value !== "string") return DEFAULT_PRIMARY_COLOR;
  const color = value.trim();
  return HEX_COLOR_PATTERN.test(color) ? color : DEFAULT_PRIMARY_COLOR;
}

function normalizeText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

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
    const primaryColor = normalizeColor(body?.primaryColor);
    const welcomeMessage = normalizeText(body?.welcomeMessage, DEFAULT_WELCOME_MESSAGE);
    const avatarSrc = normalizeOptionalText(body?.avatarSrc);
    const requestedDefaultSectionId = normalizeOptionalText(body?.defaultSectionId);

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
      .where(eq(chatBotMetadata.chatbot_id, workspaceId))
      .orderBy(asc(chatBotMetadata.created_at), asc(chatBotMetadata.id))
      .limit(1);

    if (existing) {
      await db
        .update(chatBotMetadata)
        .set({
          color: primaryColor,
          welcome_message: welcomeMessage,
          avatar_src: avatarSrc,
          default_section_id: defaultSectionId,
          updated_at: new Date(),
        })
        .where(eq(chatBotMetadata.chatbot_id, workspaceId));

      return NextResponse.json({
        data: {
          primaryColor,
          welcomeMessage,
          avatarSrc,
          defaultSectionId,
          widgetId: existing.widget_id,
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
