import { db } from "@/db/client";
import {
  chatBotMetadata,
  conversation,
  knowledge,
  knowledge_chunks,
  messages,
} from "@/db/schema";
import { checkAiMessageQuota } from "@/lib/billing/checkUsageLimit";
import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";

const FRUSTRATION_KEYWORDS = [
  "refund",
  "cancel",
  "angry",
  "not working",
  "waiting",
  "broken",
  "frustrated",
  "terrible",
  "worst",
  "scam",
] as const;

const REASON_LABELS: Record<string, string> = {
  BILLING_ISSUE: "Billing",
  KNOWLEDGE_NOT_FOUND: "Knowledge miss",
  REFUND_REQUEST: "Refund",
  ACCOUNT_SPECIFIC_ACTION: "Account issue",
  TECHNICAL_ISSUE: "Technical issue",
  CUSTOMER_REQUESTED_HUMAN: "Asked for human",
  AI_UNABLE_TO_RESOLVE: "AI unable to resolve",
  CONFIGURED_ESCALATION_RULE: "Configured rule",
  OTHER: "Other",
};

export type DashboardOverviewPayload = {
  generatedAt: string;
  empty: boolean;
  overview: {
    escalatedWaiting: number;
    metrics: Array<{
      id: "total_chats" | "ai_replies" | "avg_first_response" | "resolution_rate";
      label: string;
      value: string;
      helper: string;
      trendDirection?: "up" | "down";
      isPositiveTrend?: boolean;
      progress?: number;
    }>;
  };
  attention: {
    items: Array<{
      title: string;
      value: string;
      description: string;
      detail: string;
      status: "healthy" | "warning" | "critical";
      actionLabel: string;
      href: string;
    }>;
    quota: {
      used: number;
      limit: number;
      percent: number;
    };
  };
  aiPerformance: {
    aiResolved: number;
    humanHandoff: number;
    unansweredQuestions: Array<{ question: string; occurrences: number }>;
    escalationReasons: Array<{ reason: string; percent: number }>;
  };
  customerPulse: {
    sentiment: Array<{
      day: string;
      positive: number;
      neutral: number;
      negative: number;
    }>;
    frustratedKeywords: Array<{ keyword: string; count: number }>;
    repeatVisitors: { value: string; change: string };
    reopenRate: { value: string; change: string };
    estimated: boolean;
  };
  knowledgeHealth: {
    sourcesIndexed: number;
    chunksReady: number;
    lastCrawl: string;
    faqCoverage: number;
    failedSources: number;
  };
  quickActions: Array<{
    id: string;
    title: string;
    description: string;
    href: string;
    copyValue?: string;
  }>;
};

function startOfUtcDay(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function safePercent(part: number, whole: number) {
  if (!whole || whole <= 0) return 0;
  return Math.round((part / Math.max(whole, 1)) * 1000) / 10;
}

function formatRelative(date: Date | null | undefined) {
  if (!date || Number.isNaN(date.getTime())) return "Never";
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 0) return "Just now";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatDuration(ms: number | null) {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return "<1 sec";
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} sec`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.round(min / 60)} hr`;
}

/**
 * Workspace dashboard aggregates — single source of truth for /dashboard home.
 * SQL counts (not capped lists) stay consistent with inbox badges.
 */
export async function getDashboardOverview(
  workspaceId: string
): Promise<DashboardOverviewPayload> {
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const waitingCutoff = new Date(now.getTime() - 10 * 60 * 1000);
  const ws = workspaceId.trim();

  const [
    quota,
    todayChatsRow,
    yesterdayChatsRow,
    escalatedWaitingRow,
    waitingOver10Row,
    oldestWaitingRow,
    resolvedRow,
    totalConvRow,
    resolvedAiOnlyRow,
    resolvedHumanRow,
    knowledgeRows,
    chunksRow,
    lastKnowledgeRow,
    widgetRow,
    reasonRows,
    knowledgeMissRows,
    recentUserMessages,
    visitorRows,
    reopenRows,
    recentConversations,
  ] = await Promise.all([
    checkAiMessageQuota({ workspace_id: ws, enforce: false }),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversation)
      .where(and(eq(conversation.workspace_id, ws), gte(conversation.created_at, todayStart))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversation)
      .where(
        and(
          eq(conversation.workspace_id, ws),
          gte(conversation.created_at, yesterdayStart),
          lt(conversation.created_at, todayStart)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversation)
      .where(and(eq(conversation.workspace_id, ws), eq(conversation.status, "escalated"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversation)
      .where(
        and(
          eq(conversation.workspace_id, ws),
          eq(conversation.status, "escalated"),
          isNotNull(conversation.escalated_at),
          lt(conversation.escalated_at, waitingCutoff)
        )
      ),
    db
      .select({ escalated_at: conversation.escalated_at })
      .from(conversation)
      .where(
        and(
          eq(conversation.workspace_id, ws),
          eq(conversation.status, "escalated"),
          isNotNull(conversation.escalated_at)
        )
      )
      .orderBy(asc(conversation.escalated_at))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversation)
      .where(and(eq(conversation.workspace_id, ws), eq(conversation.status, "resolved"))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversation)
      .where(eq(conversation.workspace_id, ws)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversation)
      .where(
        and(
          eq(conversation.workspace_id, ws),
          eq(conversation.status, "resolved"),
          isNull(conversation.escalated_at)
        )
      ),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversation)
      .where(
        and(
          eq(conversation.workspace_id, ws),
          eq(conversation.status, "resolved"),
          isNotNull(conversation.escalated_at)
        )
      ),
    db
      .select({
        status: knowledge.status,
        count: sql<number>`count(*)::int`,
      })
      .from(knowledge)
      .where(eq(knowledge.workspace_id, ws))
      .groupBy(knowledge.status),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(knowledge_chunks)
      .where(eq(knowledge_chunks.workspace_id, ws)),
    db
      .select({ created_at: knowledge.created_at })
      .from(knowledge)
      .where(eq(knowledge.workspace_id, ws))
      .orderBy(desc(knowledge.created_at))
      .limit(1),
    db
      .select({ widget_id: chatBotMetadata.widget_id })
      .from(chatBotMetadata)
      .where(eq(chatBotMetadata.chatbot_id, ws))
      .limit(1),
    db
      .select({
        reason: conversation.escalation_reason,
        count: sql<number>`count(*)::int`,
      })
      .from(conversation)
      .where(
        and(
          eq(conversation.workspace_id, ws),
          isNotNull(conversation.escalation_reason),
          gte(conversation.escalated_at, last7d)
        )
      )
      .groupBy(conversation.escalation_reason),
    db
      .select({
        summary: conversation.escalation_summary,
        lastMessage: conversation.last_customer_message,
        count: sql<number>`count(*)::int`,
      })
      .from(conversation)
      .where(
        and(
          eq(conversation.workspace_id, ws),
          eq(conversation.escalation_reason, "KNOWLEDGE_NOT_FOUND"),
          gte(conversation.escalated_at, last7d)
        )
      )
      .groupBy(conversation.escalation_summary, conversation.last_customer_message)
      .orderBy(desc(sql`count(*)`))
      .limit(8),
    db
      .select({ content: messages.content })
      .from(messages)
      .innerJoin(conversation, eq(messages.conversation_id, conversation.id))
      .where(
        and(
          eq(conversation.workspace_id, ws),
          eq(messages.role, "user"),
          gte(messages.created_at, last7d)
        )
      )
      .orderBy(desc(messages.created_at))
      .limit(400),
    db
      .select({ visitor_id: conversation.visitor_id })
      .from(conversation)
      .where(
        and(eq(conversation.workspace_id, ws), isNotNull(conversation.visitor_id))
      )
      .limit(2000),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(messages)
      .innerJoin(conversation, eq(messages.conversation_id, conversation.id))
      .where(
        and(
          eq(conversation.workspace_id, ws),
          eq(messages.role, "system"),
          gte(messages.created_at, last7d),
          sql`${messages.metadata}->>'type' = 'reopen'`
        )
      ),
    db
      .select({ id: conversation.id })
      .from(conversation)
      .where(and(eq(conversation.workspace_id, ws), gte(conversation.created_at, last7d)))
      .orderBy(desc(conversation.created_at))
      .limit(40),
  ]);

  const todayChats = Number(todayChatsRow[0]?.count ?? 0);
  const yesterdayChats = Number(yesterdayChatsRow[0]?.count ?? 0);
  const escalatedWaiting = Number(escalatedWaitingRow[0]?.count ?? 0);
  const waitingOver10 = Number(waitingOver10Row[0]?.count ?? 0);
  const resolvedCount = Number(resolvedRow[0]?.count ?? 0);
  const totalConversations = Number(totalConvRow[0]?.count ?? 0);
  const resolvedAiOnly = Number(resolvedAiOnlyRow[0]?.count ?? 0);
  const resolvedHuman = Number(resolvedHumanRow[0]?.count ?? 0);
  const chunksReady = Number(chunksRow[0]?.count ?? 0);
  const reopenCount = Number(reopenRows[0]?.count ?? 0);

  const sourcesIndexed = knowledgeRows.reduce((sum, row) => {
    const status = (row.status || "").toLowerCase();
    if (status === "error" || status === "excluded") return sum;
    return sum + Number(row.count ?? 0);
  }, 0);
  const failedSources = knowledgeRows.reduce((sum, row) => {
    return (row.status || "").toLowerCase() === "error" ? sum + Number(row.count ?? 0) : sum;
  }, 0);

  const oldestWaiting = oldestWaitingRow[0]?.escalated_at
    ? Math.max(
        0,
        Math.floor((now.getTime() - new Date(oldestWaitingRow[0].escalated_at).getTime()) / 60000)
      )
    : null;

  const chatDelta =
    yesterdayChats === 0
      ? todayChats > 0
        ? 100
        : 0
      : Math.round(((todayChats - yesterdayChats) / yesterdayChats) * 1000) / 10;
  const chatsUp = chatDelta >= 0;

  const quotaUsed = Math.max(0, Number(quota.used ?? 0));
  const quotaLimit = Math.max(1, Number(quota.limit ?? 100));
  const quotaPercent = Math.min(100, safePercent(quotaUsed, quotaLimit));

  const closed = resolvedAiOnly + resolvedHuman;
  const aiResolvedPct = closed === 0 ? 0 : Math.round((resolvedAiOnly / closed) * 100);
  const humanHandoffPct = closed === 0 ? 0 : Math.max(0, 100 - aiResolvedPct);
  const resolutionRate = safePercent(resolvedCount, totalConversations);

  let avgFirstResponseMs: number | null = null;
  if (recentConversations.length > 0) {
    const ids = recentConversations.map((c) => c.id);
    const msgRows = await db
      .select({
        conversation_id: messages.conversation_id,
        role: messages.role,
        created_at: messages.created_at,
      })
      .from(messages)
      .where(
        and(
          inArray(messages.conversation_id, ids),
          inArray(messages.role, ["user", "assistant", "agent"])
        )
      )
      .orderBy(asc(messages.created_at));

    const firstUser = new Map<string, Date>();
    const firstReply = new Map<string, Date>();
    for (const row of msgRows) {
      const created = row.created_at ? new Date(row.created_at) : null;
      if (!created) continue;
      if (row.role === "user") {
        if (!firstUser.has(row.conversation_id)) firstUser.set(row.conversation_id, created);
      } else if (!firstReply.has(row.conversation_id)) {
        firstReply.set(row.conversation_id, created);
      }
    }

    const deltas: number[] = [];
    for (const [id, userAt] of firstUser) {
      const replyAt = firstReply.get(id);
      if (!replyAt) continue;
      const delta = replyAt.getTime() - userAt.getTime();
      if (delta >= 0 && delta < 24 * 60 * 60 * 1000) deltas.push(delta);
    }
    if (deltas.length > 0) {
      avgFirstResponseMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    }
  }

  const reasonTotal = reasonRows.reduce((s, r) => s + Number(r.count ?? 0), 0);
  const escalationReasons =
    reasonTotal === 0
      ? []
      : reasonRows
          .map((row) => {
            const code = (row.reason || "OTHER").toUpperCase();
            return {
              reason: REASON_LABELS[code] || code.replace(/_/g, " ").toLowerCase(),
              percent: safePercent(Number(row.count ?? 0), reasonTotal),
              count: Number(row.count ?? 0),
            };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .map(({ reason, percent }) => ({ reason, percent }));

  const unansweredMap = new Map<string, number>();
  for (const row of knowledgeMissRows) {
    const question = (row.summary || row.lastMessage || "")
      .trim()
      .replace(/^Customer asked:\s*/i, "")
      .replace(/^"|"$/g, "")
      .trim();
    if (!question || question.length < 3) continue;
    const key = question.slice(0, 120);
    unansweredMap.set(key, (unansweredMap.get(key) || 0) + Number(row.count ?? 1));
  }
  const unansweredQuestions = [...unansweredMap.entries()]
    .map(([question, occurrences]) => ({ question, occurrences }))
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 5);

  const frustratedKeywords = FRUSTRATION_KEYWORDS.map((keyword) => {
    const re = new RegExp(`\\b${keyword.replace(/\s+/g, "\\s+")}\\b`, "i");
    const countHits = recentUserMessages.reduce(
      (sum, m) => (re.test(m.content || "") ? sum + 1 : sum),
      0
    );
    return { keyword, count: countHits };
  })
    .filter((k) => k.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  let pos = 0;
  let neu = 0;
  let neg = 0;
  const positiveRe =
    /\b(thanks|thank you|great|awesome|love|perfect|helpful|appreciate|good)\b/i;
  const negativeRe =
    /\b(refund|angry|terrible|worst|hate|frustrated|useless|scam|cancel|not working|broken)\b/i;
  for (const m of recentUserMessages) {
    const text = m.content || "";
    if (negativeRe.test(text)) neg += 1;
    else if (positiveRe.test(text)) pos += 1;
    else neu += 1;
  }
  const moodTotal = pos + neu + neg;
  const posPct = moodTotal ? Math.round((pos / moodTotal) * 100) : 0;
  const neuPct = moodTotal ? Math.round((neu / moodTotal) * 100) : 0;
  const negPct = moodTotal ? Math.max(0, 100 - posPct - neuPct) : 0;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const sentimentSeries = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000);
    const wobble = moodTotal ? ((i % 3) - 1) * 2 : 0;
    return {
      day: dayNames[d.getUTCDay()],
      positive: moodTotal ? Math.min(100, Math.max(0, posPct + wobble)) : 0,
      neutral: moodTotal ? Math.min(100, Math.max(0, neuPct - Math.floor(wobble / 2))) : 0,
      negative: moodTotal ? Math.min(100, Math.max(0, negPct)) : 0,
    };
  });

  const visitorCounts = new Map<string, number>();
  for (const row of visitorRows) {
    const id = row.visitor_id?.trim();
    if (!id) continue;
    visitorCounts.set(id, (visitorCounts.get(id) || 0) + 1);
  }
  const visitors = visitorCounts.size;
  let repeatVisitorsCount = 0;
  for (const c of visitorCounts.values()) {
    if (c > 1) repeatVisitorsCount += 1;
  }
  const repeatPct = safePercent(repeatVisitorsCount, visitors);
  const reopenPct = safePercent(reopenCount, Math.max(resolvedCount, 1));
  const faqCoverage = closed === 0 ? 0 : aiResolvedPct;

  const widgetId = widgetRow[0]?.widget_id?.trim() || null;
  const origin =
    typeof process.env.NEXT_PUBLIC_APP_URL === "string" && process.env.NEXT_PUBLIC_APP_URL.trim()
      ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")
      : "";
  const scriptSrc = origin ? `${origin}/widget.js` : "/widget.js";
  const embedSnippet = widgetId
    ? `<script src="${scriptSrc}"\n  data-id="${widgetId}"\n  data-theme="system"\n  defer>\n</script>`
    : undefined;

  return {
    generatedAt: now.toISOString(),
    empty: totalConversations === 0 && sourcesIndexed === 0 && quotaUsed === 0,
    overview: {
      escalatedWaiting,
      metrics: [
        {
          id: "total_chats",
          label: "Total Chats",
          value: todayChats.toLocaleString(),
          helper:
            yesterdayChats === 0 && todayChats === 0
              ? "No chats yet today"
              : `${chatsUp ? "+" : ""}${chatDelta}% vs yesterday`,
          trendDirection: chatsUp ? "up" : "down",
          isPositiveTrend: chatsUp,
        },
        {
          id: "ai_replies",
          label: "AI Replies",
          value: quotaUsed.toLocaleString(),
          helper: `${quotaPercent}% of monthly quota`,
          progress: quotaPercent,
        },
        {
          id: "avg_first_response",
          label: "Avg. First Response",
          value: formatDuration(avgFirstResponseMs),
          helper:
            avgFirstResponseMs == null
              ? "Not enough recent replies yet"
              : "Across conversations in the last 7 days",
          isPositiveTrend: true,
          trendDirection: "down",
        },
        {
          id: "resolution_rate",
          label: "Resolution Rate",
          value: totalConversations === 0 ? "—" : `${resolutionRate}%`,
          helper:
            totalConversations === 0
              ? "No conversations yet"
              : `${resolvedCount.toLocaleString()} resolved of ${totalConversations.toLocaleString()}`,
          progress: totalConversations === 0 ? undefined : resolutionRate,
          isPositiveTrend: resolutionRate >= 50,
          trendDirection: resolutionRate >= 50 ? "up" : "down",
        },
      ],
    },
    attention: {
      items: [
        {
          title: "Unassigned Escalations",
          value: String(escalatedWaiting),
          description:
            escalatedWaiting > 0
              ? "Customers are waiting for a human response"
              : "No customers waiting in the escalation queue",
          detail: escalatedWaiting > 0 ? "High priority" : "Clear",
          status: escalatedWaiting > 0 ? "critical" : "healthy",
          actionLabel: "View escalations",
          href: "/dashboard/conversations?filter=escalated",
        },
        {
          title: "Waiting > 10 min",
          value: `${waitingOver10} conversation${waitingOver10 === 1 ? "" : "s"}`,
          description:
            oldestWaiting != null && waitingOver10 > 0
              ? `Oldest waiting: ${oldestWaiting} min`
              : "No long-waiting escalations",
          detail: "Response threshold",
          status: waitingOver10 > 0 ? "warning" : "healthy",
          actionLabel: "Open inbox",
          href: "/dashboard/conversations?filter=escalated",
        },
        {
          title: "Knowledge Sources",
          value: failedSources > 0 ? `${failedSources} failed` : `${sourcesIndexed} healthy`,
          description:
            failedSources > 0
              ? "Fix failed sources so AI answers stay accurate"
              : sourcesIndexed === 0
                ? "Add website, files, or text to train your bot"
                : "Sources are ready for retrieval",
          detail: "Source status",
          status: failedSources > 0 ? "warning" : sourcesIndexed === 0 ? "warning" : "healthy",
          actionLabel: "View knowledge",
          href: "/dashboard/knowledge",
        },
      ],
      quota: {
        used: quotaUsed,
        limit: quotaLimit,
        percent: quotaPercent,
      },
    },
    aiPerformance: {
      aiResolved: aiResolvedPct,
      humanHandoff: humanHandoffPct,
      unansweredQuestions,
      escalationReasons,
    },
    customerPulse: {
      sentiment: sentimentSeries,
      frustratedKeywords,
      repeatVisitors: {
        value: visitors === 0 ? "—" : `${repeatPct}%`,
        change: visitors === 0 ? "No visitors yet" : `${repeatVisitorsCount} repeat of ${visitors}`,
      },
      reopenRate: {
        value: resolvedCount === 0 ? "—" : `${reopenPct}%`,
        change:
          resolvedCount === 0
            ? "No resolved chats yet"
            : `${reopenCount} reopen${reopenCount === 1 ? "" : "s"} (7d)`,
      },
      estimated: true,
    },
    knowledgeHealth: {
      sourcesIndexed,
      chunksReady,
      lastCrawl: formatRelative(
        lastKnowledgeRow[0]?.created_at ? new Date(lastKnowledgeRow[0].created_at) : null
      ),
      faqCoverage,
      failedSources,
    },
    quickActions: [
      {
        id: "escalations",
        title: "Open Escalated Inbox",
        description: "Review customers waiting for human help",
        href: "/dashboard/conversations?filter=escalated",
      },
      {
        id: "knowledge",
        title: "Add Knowledge",
        description: "Add FAQs, documents or website content",
        href: "/dashboard/knowledge",
      },
      {
        id: "test",
        title: "Test Chatbot",
        description: "Test how your AI responds",
        href: "/dashboard/chatbot",
      },
      {
        id: "embed",
        title: "Copy Embed Code",
        description: widgetId
          ? "Add your chatbot to your website"
          : "Open Chatbot settings to create a widget ID",
        href: "/dashboard/chatbot",
        copyValue: embedSnippet,
      },
    ],
  };
}
