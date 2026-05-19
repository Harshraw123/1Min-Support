import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { knowledge as knowledgeTable } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/getSession";
import { deleteKnowledgeChunks } from "@/lib/knowledge/deleteKnowledgeChunks";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    const userEmail = session?.email?.trim() || session?.user?.email?.trim();
    const workspaceId =
      typeof session?.organization_id === "string" && session.organization_id.trim()
        ? session.organization_id.trim()
        : null;

    if (!userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!workspaceId) {
      return NextResponse.json(
        { message: "Missing workspace context (organization_id)" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id")?.trim();
    if (!id) {
      return NextResponse.json({ message: "Knowledge id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: knowledgeTable.id })
      .from(knowledgeTable)
      .where(and(eq(knowledgeTable.id, id), eq(knowledgeTable.workspace_id, workspaceId)))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ message: "Knowledge source not found" }, { status: 404 });
    }

    await deleteKnowledgeChunks(id);

    const [deleted] = await db
      .delete(knowledgeTable)
      .where(and(eq(knowledgeTable.id, id), eq(knowledgeTable.workspace_id, workspaceId)))
      .returning();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("[KNOWLEDGE_DELETE_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
