import { db } from "@/db/client";
import { teamMembers } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { scalekit } from "@/lib/scalekit";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function isScalekitAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    _errorCode?: string;
    _httpStatus?: number;
    _message?: string;
    message?: string;
  };

  const code = maybeError._errorCode ?? "";
  const status = maybeError._httpStatus ?? 0;
  const message = (maybeError._message ?? maybeError.message ?? "").toLowerCase();

  return (
    code === "RESOURCE_ALREADY_EXISTS" ||
    status === 409 ||
    message.includes("already_exists") ||
    message.includes("already exists")
  );
}

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

    // Step 1: DB mein insert karo (pending status)
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

    //  Step 2: Scalekit se invitation email bhejo
    try {
      await scalekit.user.createUserAndMembership(organizationId, {
        email,
        userProfile: {
          firstName: displayName,
        },
      });
    } catch (inviteError) {
      if (isScalekitAlreadyExistsError(inviteError)) {
        // User already exists in ScaleKit, so keep DB row and mark as active to avoid blocking flow.
        await db
          .update(teamMembers)
          .set({ status: "active" })
          .where(eq(teamMembers.id, member.id));

        return NextResponse.json({
          message: "Member already exists and has been added to the team",
          member: {
            ...member,
            status: "active",
          },
        });
      }

      // Non-recoverable invite failure: rollback DB row.
      await db.delete(teamMembers).where(eq(teamMembers.id, member.id));
      console.error("SCALEKIT_INVITE_ERROR", inviteError);
      return NextResponse.json(
        { message: "Failed to send invitation email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Invitation sent",
      member,
    });
  } catch (error) {
    console.error("TEAM_ADD_ERROR", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}