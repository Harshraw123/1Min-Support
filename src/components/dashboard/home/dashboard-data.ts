import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BookOpen,
  Bot,
  Clock,
  Code2,
  Copy,
  Inbox,
  MessageCircle,
  Plus,
} from "lucide-react";
import type { DashboardOverviewPayload } from "@/lib/dashboard/getDashboardOverview";

export type TrendDirection = "up" | "down";
export type SemanticStatus = "healthy" | "warning" | "critical";

export type DashboardMetric = {
  id?: string;
  label: string;
  value: string;
  helper: string;
  trendDirection?: TrendDirection;
  isPositiveTrend?: boolean;
  icon: LucideIcon;
  progress?: number;
};

export type AttentionItem = {
  title: string;
  value: string;
  description: string;
  detail: string;
  status: SemanticStatus;
  actionLabel: string;
  href: string;
};

export type SentimentData = {
  day: string;
  positive: number;
  neutral: number;
  negative: number;
};

export type EscalationReason = {
  reason: string;
  percent: number;
};

export type KnowledgeHealth = {
  sourcesIndexed: number;
  chunksReady: number;
  lastCrawl: string;
  faqCoverage: number;
  failedSources?: number;
};

export type DashboardData = {
  generatedAt?: string;
  empty?: boolean;
  overview: {
    metrics: DashboardMetric[];
    escalatedWaiting: number;
  };
  attention: {
    items: AttentionItem[];
    quota: {
      used: number;
      limit: number;
      percent?: number;
    };
  };
  aiPerformance: {
    aiResolved: number;
    humanHandoff: number;
    unansweredQuestions: Array<{
      question: string;
      occurrences: number;
    }>;
    escalationReasons: EscalationReason[];
  };
  customerPulse: {
    sentiment: SentimentData[];
    frustratedKeywords: Array<{
      keyword: string;
      count: number;
    }>;
    repeatVisitors: {
      value: string;
      change: string;
    };
    reopenRate: {
      value: string;
      change: string;
    };
    estimated?: boolean;
  };
  knowledgeHealth: KnowledgeHealth;
  quickActions: Array<{
    title: string;
    description: string;
    href: string;
    icon: LucideIcon;
    copyValue?: string;
  }>;
};

const METRIC_ICONS: Record<string, LucideIcon> = {
  total_chats: MessageCircle,
  ai_replies: Bot,
  avg_first_response: Clock,
  resolution_rate: AlertCircle,
};

const ACTION_ICONS: Record<string, LucideIcon> = {
  escalations: Inbox,
  knowledge: BookOpen,
  test: MessageCircle,
  embed: Code2,
};

export const quickActionBadgeIcons = {
  add: Plus,
  copy: Copy,
};

/** Map API payload → UI model (icons live on the client). */
export function mapOverviewToDashboardData(
  payload: DashboardOverviewPayload
): DashboardData {
  return {
    generatedAt: payload.generatedAt,
    empty: payload.empty,
    overview: {
      escalatedWaiting: payload.overview.escalatedWaiting,
      metrics: payload.overview.metrics.map((m) => ({
        ...m,
        icon: METRIC_ICONS[m.id] ?? MessageCircle,
      })),
    },
    attention: {
      items: payload.attention.items,
      quota: payload.attention.quota,
    },
    aiPerformance: payload.aiPerformance,
    customerPulse: payload.customerPulse,
    knowledgeHealth: payload.knowledgeHealth,
    quickActions: payload.quickActions.map((a) => ({
      title: a.title,
      description: a.description,
      href: a.href,
      copyValue: a.copyValue,
      icon: ACTION_ICONS[a.id] ?? Inbox,
    })),
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard/overview", {
    method: "GET",
    credentials: "same-origin",
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as
    | DashboardOverviewPayload
    | { message?: string };

  if (!res.ok) {
    throw new Error(
      "message" in body && typeof body.message === "string"
        ? body.message
        : `Dashboard request failed (${res.status})`
    );
  }

  return mapOverviewToDashboardData(body as DashboardOverviewPayload);
}
