import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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

    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      name?: string;
    };

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const [existing] = await db
      .select({ id: teamMembers.id })
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.organization_id, organizationId),
          eq(teamMembers.user_email, email)
        )
      );

    if (existing) {
      return NextResponse.json(
        { message: "This email is already on the team" },
        { status: 409 }
      );
    }

    const displayName = name || email.split("@")[0] || "Member";

    const [member] = await db
      .insert(teamMembers)
      .values({
        user_email: email,
        name: displayName,
        organization_id: organizationId,
        role: "member",
        status: "pending",
      })
      .returning();

    return NextResponse.json({
      message: "Member added",
      member,
    });
  } catch (error) {
    console.error("TEAM_ADD_ERROR", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
