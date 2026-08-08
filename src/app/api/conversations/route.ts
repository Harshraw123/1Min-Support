import { NextRequest, NextResponse } from "next/server";
import {
  countOpenEscalated,
  listConversationsForWorkspace,
  requireOrgSession,
} from "@/lib/conversations";
import type { ConversationListFilter } from "@/lib/conversations/types";
import { normalizeConversationStatus } from "@/lib/conversations/types";

const FILTERS = new Set<ConversationListFilter>([
  "all",
  "active",
  "escalated",
  "unassigned",
  "mine",
  "assigned",
  "resolved",
  "human_handling",
]);

/**
 * List conversations for the session organization only.
 * Filter/search never accept a client-supplied workspace id.
 */
export async function GET(req: NextRequest) {
  const auth = await requireOrgSession();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const filterParam = (req.nextUrl.searchParams.get("filter") || "all") as ConversationListFilter;
    const filter = FILTERS.has(filterParam) ? filterParam : "all";
    const search = req.nextUrl.searchParams.get("search");

    const rows = await listConversationsForWorkspace({
      workspaceId: auth.ctx.organizationId,
      filter,
      search,
      agentEmail: auth.ctx.email,
    });

    const escalatedCount = await countOpenEscalated(auth.ctx.organizationId);

    return NextResponse.json({
      conversations: rows.map((c) => ({
        id: c.id,
        status: normalizeConversationStatus(c.status),
        handlingMode: c.handling_mode,
        name: c.name,
        visitorId: c.visitor_id,
        lastCustomerMessage: c.last_customer_message,
        escalationReason: c.escalation_reason,
        escalationSummary: c.escalation_summary,
        escalatedAt: c.escalated_at,
        escalatedBy: c.escalated_by,
        priority: c.priority,
        assignedAgentId: c.assigned_agent_id,
        assignedAgentEmail: c.assigned_agent_email,
        assignedAgentName: c.assigned_agent_name,
        assignedAt: c.assigned_at,
        resolvedAt: c.resolved_at,
        resolvedBy: c.resolved_by,
        sectionId: c.section_id,
        lastMessageAt: c.last_message_at,
        createdAt: c.created_at,
      })),
      meta: { escalatedCount },
    });
  } catch (error) {
    console.error("[CONVERSATIONS_LIST_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
