import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth/getSession";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getSession();
    const userEmail = session?.email?.trim() || session?.user?.email?.trim();
    const organizationId =
      typeof session?.organization_id === "string" && session.organization_id.trim()
        ? session.organization_id.trim()
        : null;

    if (!userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!organizationId) {
      return NextResponse.json(
        { team: [], message: "Missing workspace context" },
        { status: 200 }
      );
    }

    const rows = await db
      .select({
        id: teamMembers.id,
        name: teamMembers.name,
        user_email: teamMembers.user_email,
        role: teamMembers.role,
        status: teamMembers.status,
        created_at: teamMembers.created_at,
      })
      .from(teamMembers)
      .where(eq(teamMembers.organization_id, organizationId));

    return NextResponse.json({ team: rows });
  } catch (error) {
    console.error("[TEAM_FETCH_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
