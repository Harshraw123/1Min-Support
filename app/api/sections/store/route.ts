import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sections as sectionsTable } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { eq } from "drizzle-orm";

type SectionPayload = {
  id?: string;
  name?: string;
  description?: string;
  tone?: string;
  scope_label?: string;
  allowed_topics?: string;
  blocked_topics?: string;
  fallback_behavior?: string;
  source_ids?: string[]; // stored as JSON string
  status?: string;
};

function safeStringArrayJson(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  const filtered = value.filter((v) => typeof v === "string") as string[];
  try {
    return JSON.stringify(filtered);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = user.organization_id ?? "";
    const body = (await req.json().catch(() => null)) as SectionPayload | null;
    if (!body) {
      return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
    }

    const name = (body.name ?? "").trim();
    const description = (body.description ?? "").trim();

    if (!name || !description) {
      return NextResponse.json(
        { message: "Name and description are required" },
        { status: 400 }
      );
    }

    const [inserted] = await db
      .insert(sectionsTable)
      .values({
        user_email: user.email,
        workspace_id: workspaceId,
        name,
        description,
        tone: (body.tone ?? "neutral").trim() || "neutral",
        scope_label: (body.scope_label ?? "general").trim() || "general",
        allowed_topics: (body.allowed_topics ?? "").trim() || null,
        blocked_topics: (body.blocked_topics ?? "").trim() || null,
        fallback_behavior: (body.fallback_behavior ?? "escalate").trim() || "escalate",
        source_ids: safeStringArrayJson(body.source_ids) ?? null,
        status: (body.status ?? "active").trim() || "active",
      })
      .returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    console.error("[SECTIONS_STORE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as SectionPayload | null;
    if (!body?.id) {
      return NextResponse.json({ message: "Missing section id" }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string") updates.name = body.name.trim();
    if (typeof body.description === "string")
      updates.description = body.description.trim();
    if (typeof body.tone === "string") updates.tone = body.tone.trim();
    if (typeof body.scope_label === "string")
      updates.scope_label = body.scope_label.trim();
    if (typeof body.allowed_topics === "string")
      updates.allowed_topics = body.allowed_topics.trim() || null;
    if (typeof body.blocked_topics === "string")
      updates.blocked_topics = body.blocked_topics.trim() || null;
    if (typeof body.fallback_behavior === "string")
      updates.fallback_behavior = body.fallback_behavior.trim() || "escalate";
    if (Array.isArray(body.source_ids))
      updates.source_ids = safeStringArrayJson(body.source_ids) ?? null;
    if (typeof body.status === "string") updates.status = body.status.trim();

    const [updated] = await db
      .update(sectionsTable)
      .set(updates)
      .where(eq(sectionsTable.id, body.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("[SECTIONS_UPDATE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as { id?: string } | null;
    if (!body?.id) {
      return NextResponse.json({ message: "Missing section id" }, { status: 400 });
    }

    const [deleted] = await db
      .delete(sectionsTable)
      .where(eq(sectionsTable.id, body.id))
      .returning();

    if (!deleted) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[SECTIONS_DELETE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}

