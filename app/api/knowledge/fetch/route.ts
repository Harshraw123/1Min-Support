import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { knowledge as knowledgeTable } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { and, desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSession();
    const workspaceId =
      typeof user?.organization_id === "string" && user.organization_id.trim()
        ? user.organization_id.trim()
        : null;
    if (!user || !workspaceId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!workspaceId) {
      return NextResponse.json(
        { message: "Missing workspace context (organization_id)" },
        { status: 400 }
      );
    }

    const rows = await db
      .select()
      .from(knowledgeTable)
      .where(eq(knowledgeTable.workspace_id, workspaceId));
      .where(
        and(
          eq(knowledgeTable.user_email, userEmail),
          eq(knowledgeTable.workspace_id, workspaceId)
        )
      )
      .orderBy(desc(knowledgeTable.created_at));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("[KNOWLEDGE_FETCH_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
