import { db } from "@/db/client";
import { chatBotMetadata, sections } from "@/db/schema";
import { getSession } from "@/lib/auth/getSession";
import { and, eq, sql } from "drizzle-orm";
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

    const [saved] = await db
      .insert(chatBotMetadata)
      .values({
        chatbot_id: workspaceId,
        color: primaryColor,
        welcome_message: welcomeMessage,
        avatar_src: avatarSrc,
        default_section_id: defaultSectionId,
      })
      .onConflictDoUpdate({
        target: chatBotMetadata.chatbot_id,
        set: {
          color: primaryColor,
          welcome_message: welcomeMessage,
          avatar_src: avatarSrc,
          default_section_id: defaultSectionId,
          updated_at: sql`now()`,
        },
      })
      .returning();

    return NextResponse.json({
      data: {
        primaryColor: saved.color,
        welcomeMessage: saved.welcome_message,
        avatarSrc: saved.avatar_src,
        defaultSectionId: saved.default_section_id,
        widgetId: saved.widget_id,
      },
    });
  } catch (error) {
    console.error("METADATA_UPDATE_ERROR", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
