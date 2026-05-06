import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sections } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { and, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

type StorePayload = {
  id?: string;
  name?: string;
  description?: string;
  tone?: string;
  scope_label?: string;
  allowed_topics?: string;
  blocked_topics?: string;
  fallback_behavior?: string;
  status?: string;
};

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

async function requireSessionContext() {
  const session = await getSession();
  const userEmail = session?.email?.trim() || session?.user?.email?.trim();
  const workspaceId =
    typeof session?.organization_id === "string" && session.organization_id.trim()
      ? session.organization_id.trim()
      : null;

  if (!userEmail) {
    return { ok: false as const, response: NextResponse.json({ message: "Unauthorized" }, { status: 401 }) };
  }

  // `sections.workspace_id` is notNull in schema — enforce it.
  if (!workspaceId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Missing workspace context (organization_id)" },
        { status: 400 }
      ),
    };
  }

  return { ok: true as const, workspaceId };
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireSessionContext();
    if (!ctx.ok) return ctx.response;

    const body = (await req.json()) as StorePayload;

    const name = normalizeOptionalText(body.name);
    const description = normalizeOptionalText(body.description);
    const tone = normalizeOptionalText(body.tone) ?? "neutral";
    const scopeLabel = normalizeOptionalText(body.scope_label) ?? "general";
    const fallbackBehavior = normalizeOptionalText(body.fallback_behavior) ?? "escalate";
    const allowedTopics = normalizeOptionalText(body.allowed_topics);
    const blockedTopics = normalizeOptionalText(body.blocked_topics);
    const status = normalizeOptionalText(body.status) ?? "active";

    if (!name || !description) {
      return NextResponse.json({ message: "Name and description are required" }, { status: 400 });
    }

    const [created] = await db
      .insert(sections)
      .values({
        chatbot_id: ctx.workspaceId,
        workspace_id: ctx.workspaceId,
        name,
        description,
        tone,
        scope_label: scopeLabel,
        allowed_topics: allowedTopics,
        blocked_topics: blockedTopics,
        fallback_behavior: fallbackBehavior,
        status,
      })
      .returning();

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("[SECTIONS_STORE_POST_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ctx = await requireSessionContext();
    if (!ctx.ok) return ctx.response;

    const body = (await req.json()) as StorePayload;
    const id = normalizeOptionalText(body.id);
    if (!id) return NextResponse.json({ message: "Section id is required" }, { status: 400 });

    const patch: Partial<typeof sections.$inferInsert> = {};

    const name = normalizeOptionalText(body.name);
    if (name !== null) patch.name = name;

    const description = normalizeOptionalText(body.description);
    if (description !== null) patch.description = description;

    const tone = normalizeOptionalText(body.tone);
    if (tone !== null) patch.tone = tone;

    const scopeLabel = normalizeOptionalText(body.scope_label);
    if (scopeLabel !== null) patch.scope_label = scopeLabel;

    const allowedTopics = normalizeOptionalText(body.allowed_topics);
    if (body.allowed_topics !== undefined) patch.allowed_topics = allowedTopics;

    const blockedTopics = normalizeOptionalText(body.blocked_topics);
    if (body.blocked_topics !== undefined) patch.blocked_topics = blockedTopics;

    const fallbackBehavior = normalizeOptionalText(body.fallback_behavior);
    if (fallbackBehavior !== null) patch.fallback_behavior = fallbackBehavior;

    const status = normalizeOptionalText(body.status);
    if (status !== null) patch.status = status;

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ message: "No fields to update" }, { status: 400 });
    }

    const [updated] = await db
      .update(sections)
      .set(patch)
      .where(
        and(
          eq(sections.id, id),
          eq(sections.chatbot_id, ctx.workspaceId),
          eq(sections.workspace_id, ctx.workspaceId)
        )
      )
      .returning();

    if (!updated) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({ data: updated }, { status: 200 });
  } catch (error) {
    console.error("[SECTIONS_STORE_PUT_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const ctx = await requireSessionContext();
    if (!ctx.ok) return ctx.response;

    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const id = normalizeOptionalText(body.id);
    if (!id) return NextResponse.json({ message: "Section id is required" }, { status: 400 });

    const [deleted] = await db
      .delete(sections)
      .where(
        and(
          eq(sections.id, id),
          eq(sections.chatbot_id, ctx.workspaceId),
          eq(sections.workspace_id, ctx.workspaceId)
        )
      )
      .returning();

    if (!deleted) return NextResponse.json({ message: "Section not found" }, { status: 404 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[SECTIONS_STORE_DELETE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

