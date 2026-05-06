import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    const userEmail = session?.email?.trim() || session?.user?.email?.trim();
    const organizationId =
      typeof session?.organization_id === "string" && session.organization_id.trim()
        ? session.organization_id.trim()
        : null;

    if (!userEmail || !organizationId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as { id?: string };
    const memberId = typeof body.id === "string" ? body.id.trim() : "";

    if (!memberId) {
      return NextResponse.json({ message: "Member id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.organization_id, organizationId)
        )
      );

    if (!existing) {
      return NextResponse.json({ message: "Member not found" }, { status: 404 });
    }

    await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.id, memberId),
          eq(teamMembers.organization_id, organizationId)
        )
      );

    return NextResponse.json({ message: "Member removed" });
  } catch (error) {
    console.error("TEAM_DELETE_ERROR", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
