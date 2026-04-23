import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { knowledge as knowledgeTable } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const user = await getSession();
    if (!user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const rows = await db
      .select()
      .from(knowledgeTable)
      .where(eq(knowledgeTable.user_email, user.email));

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("[KNOWLEDGE_FETCH_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
