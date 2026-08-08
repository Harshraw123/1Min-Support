import { db } from "@/db/client";
import { conversation, teamMembers } from "@/db/schema";
import { getSession, type SessionUser } from "@/lib/auth/getSession";
import { and, eq } from "drizzle-orm";

export type OrgSession = {
  email: string;
  name?: string;
  organizationId: string;
  session: SessionUser;
};

/**
 * Require a logged-in dashboard user with a workspace (Scalekit organization_id).
 * Tenant id always comes from the session — never from the client body.
 */
export async function requireOrgSession(): Promise<
  { ok: true; ctx: OrgSession } | { ok: false; status: number; message: string }
> {
  const session = await getSession();
  const email = session?.email?.trim() || session?.user?.email?.trim();
  const organizationId =
    typeof session?.organization_id === "string" && session.organization_id.trim()
      ? session.organization_id.trim()
      : null;

  if (!email) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  if (!organizationId || !session) {
    return { ok: false, status: 400, message: "Missing workspace context (organization_id)" };
  }

  return {
    ok: true,
    ctx: {
      email,
      name: typeof session.name === "string" ? session.name : undefined,
      organizationId,
      session,
    },
  };
}

/**
 * Load a conversation only if it belongs to the caller's organization.
 * Prevents cross-tenant reads/writes even if a client guesses conversation ids.
 */
export async function getConversationForOrg(args: {
  conversationId: string;
  organizationId: string;
}) {
  const [row] = await db
    .select()
    .from(conversation)
    .where(
      and(
        eq(conversation.id, args.conversationId),
        eq(conversation.workspace_id, args.organizationId)
      )
    )
    .limit(1);

  return row ?? null;
}

/**
 * Resolve an assignable agent inside the same organization.
 * Accepts team_members.id or email. Owners (session users) may not be in team_members —
 * callers can still self-assign via email without a team row.
 */
export async function resolveOrgAgent(args: {
  organizationId: string;
  agentId?: string | null;
  agentEmail?: string | null;
}): Promise<{
  id: string | null;
  email: string;
  name: string;
  role: string;
} | null> {
  const email =
    typeof args.agentEmail === "string" && args.agentEmail.trim()
      ? args.agentEmail.trim().toLowerCase()
      : null;
  const agentId =
    typeof args.agentId === "string" && args.agentId.trim() ? args.agentId.trim() : null;

  if (agentId) {
    const [byId] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.id, agentId),
          eq(teamMembers.organization_id, args.organizationId)
        )
      )
      .limit(1);
    if (byId) {
      return {
        id: byId.id,
        email: byId.user_email,
        name: byId.name,
        role: byId.role,
      };
    }
  }

  if (email) {
    const [byEmail] = await db
      .select()
      .from(teamMembers)
      .where(
        and(
          eq(teamMembers.organization_id, args.organizationId),
          eq(teamMembers.user_email, email)
        )
      )
      .limit(1);
    if (byEmail) {
      return {
        id: byEmail.id,
        email: byEmail.user_email,
        name: byEmail.name,
        role: byEmail.role,
      };
    }

    // Org session user may not have a team_members row (workspace owner).
    return {
      id: null,
      email,
      name: email.split("@")[0] || "Agent",
      role: "owner",
    };
  }

  return null;
}
