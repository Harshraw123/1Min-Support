import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { sections } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { and, eq } from "drizzle-orm";

/**
 * Backwards-compatible route.
 * The UI uses `/api/sections/store`; keep `/api/sections/delete` working too.
 */
export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    const userEmail = session?.email?.trim() || session?.user?.email?.trim();
    const workspaceId =
      typeof session?.organization_id === "string" && session.organization_id.trim()
        ? session.organization_id.trim()
        : null;

    if (!userEmail) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    if (!workspaceId) {
      return NextResponse.json({ message: "Missing workspace context (organization_id)" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();
    if (!id) return NextResponse.json({ message: "Section id is required" }, { status: 400 });

    const [deleted] = await db
      .delete(sections)
      .where(
        and(
          eq(sections.id, id),
          eq(sections.chatbot_id, workspaceId),
          eq(sections.workspace_id, workspaceId)
        )
      )
      .returning();

    if (!deleted) return NextResponse.json({ message: "Section not found" }, { status: 404 });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[SECTIONS_DELETE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}