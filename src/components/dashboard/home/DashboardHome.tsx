"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  type AttentionItem,
  type DashboardData,
  type DashboardMetric,
  getDashboardData,
} from "./dashboard-data";

const sentimentConfig = {
  positive: {
    label: "Positive",
    color: "var(--primary)",
  },
  neutral: {
    label: "Neutral",
    color: "var(--muted-foreground)",
  },
  negative: {
    label: "Negative",
    color: "var(--destructive)",
  },
} satisfies ChartConfig;

const resolutionConfig = {
  aiResolved: {
    label: "AI resolved",
    color: "var(--primary)",
  },
  humanHandoff: {
    label: "Human handoff",
    color: "var(--brand-orange)",
  },
} satisfies ChartConfig;

const escalationConfig = {
  percent: {
    label: "Escalations",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export default function DashboardHome() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const loadData = useCallback(async (opts?: { soft?: boolean }) => {
    const soft = opts?.soft === true && hasDataRef.current;
    if (soft) setIsRefreshing(true);
    else {
      setIsLoading(true);
      setError(null);
    }

    try {
      const nextData = await getDashboardData();
      setData(nextData);
      hasDataRef.current = true;
      setLastUpdated(nextData.generatedAt ?? new Date().toISOString());
      setError(null);
    } catch (e) {
      console.error(e);
      if (!soft) {
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong while fetching your support metrics."
        );
        setData(null);
        hasDataRef.current = false;
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const id = window.setInterval(() => {
      void loadData({ soft: true });
    }, 15_000);
    return () => window.clearInterval(id);
  }, [loadData]);

  if (isLoading) {
    return <DashboardHomeSkeleton />;
  }

  if (error || !data) {
    return <DashboardError onRetry={() => void loadData()} message={error} />;
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <DashboardHeader
        escalatedWaiting={data.overview.escalatedWaiting}
        lastUpdated={lastUpdated}
        isRefreshing={isRefreshing}
        empty={data.empty === true}
      />
      <TodayOverview metrics={data.overview.metrics} />
      <NeedsAttention data={data} />
      <AIPerformance data={data} />
      <CustomerPulse data={data} />
      <KnowledgeHealth data={data} />
      <QuickActions data={data} />
    </div>
  );
}

function DashboardHeader({
  escalatedWaiting,
  lastUpdated,
  isRefreshing,
  empty,
}: {
  escalatedWaiting: number;
  lastUpdated: string | null;
  isRefreshing: boolean;
  empty: boolean;
}) {
  const hasEscalations = escalatedWaiting > 0;
  const updatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Home dashboard
          {isRefreshing ? " · refreshing" : updatedLabel ? ` · updated ${updatedLabel}` : ""}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Today&apos;s support performance
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          {empty
            ? "Your workspace is ready. Add knowledge and share the widget to start seeing live metrics."
            : "Live metrics from conversations, escalations, knowledge, and AI usage — refreshed every 15 seconds."}
        </p>
      </div>
      <Badge
        variant={hasEscalations ? "destructive" : "secondary"}
        className={cn(
          "h-8 gap-2 px-3 text-sm",
          !hasEscalations && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        )}
      >
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            hasEscalations ? "bg-destructive" : "bg-emerald-500"
          )}
        />
        {hasEscalations
          ? `${escalatedWaiting} escalation${escalatedWaiting === 1 ? "" : "s"} waiting`
          : "All escalations handled"}
      </Badge>
    </div>
  );
}

function TodayOverview({ metrics }: { metrics: DashboardMetric[] }) {
  return (
    <section className="space-y-4" aria-labelledby="today-overview">
      <SectionHeading
        id="today-overview"
        title="Today at a glance"
        description="The most important support metrics for the current day."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </div>
    </section>
  );
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  const Icon = metric.icon;
  const showTrend =
    metric.trendDirection !== undefined &&
    typeof metric.helper === "string" &&
    (/^[+-]?\d/.test(metric.helper) || metric.helper.includes("% vs"));
  const TrendIcon = metric.trendDirection === "down" ? TrendingDown : TrendingUp;

  return (
    <Card className="border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm text-muted-foreground">{metric.label}</CardTitle>
        <CardAction>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-3xl font-semibold tracking-tight tabular-nums">
          {metric.value}
        </div>
        {metric.progress !== undefined ? (
          <div className="space-y-2">
            <ProgressBar
              value={Number.isFinite(metric.progress) ? Math.max(0, Math.min(100, metric.progress)) : 0}
              status={
                metric.progress >= 90 ? "critical" : metric.progress >= 75 ? "warning" : "healthy"
              }
            />
            <p className="text-xs text-muted-foreground">{metric.helper}</p>
          </div>
        ) : showTrend ? (
          <p
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              metric.isPositiveTrend
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-destructive"
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {metric.helper}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{metric.helper}</p>
        )}
      </CardContent>
    </Card>
  );
}

function NeedsAttention({ data }: { data: DashboardData }) {
  const usagePercentage =
    typeof data.attention.quota.percent === "number"
      ? Math.max(0, Math.min(100, Math.round(data.attention.quota.percent)))
      : getUsagePercentage(data.attention.quota.used, data.attention.quota.limit);
  const quotaStatus = getQuotaStatus(usagePercentage);

  return (
    <section className="space-y-4" aria-labelledby="needs-attention">
      <SectionHeading
        id="needs-attention"
        title="Needs attention"
        description="Issues that may require your action."
      />
      <div className="grid gap-4 lg:grid-cols-4">
        {data.attention.items.map((item, index) => (
          <AttentionCard
            key={item.title}
            item={item}
            className={index === 0 ? "lg:col-span-2" : undefined}
          />
        ))}
        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Usage</CardTitle>
            <CardDescription>
              {quotaStatus === "healthy"
                ? "Your AI usage is healthy"
                : "Monthly quota is approaching its limit"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-3xl font-semibold tabular-nums">
                  {usagePercentage}%
                </div>
                <p className="mt-1 text-sm text-muted-foreground">used</p>
              </div>
              <p className="text-right text-sm text-muted-foreground tabular-nums">
                {data.attention.quota.used.toLocaleString()} /{" "}
                {data.attention.quota.limit.toLocaleString()} replies
              </p>
            </div>
            <ProgressBar value={usagePercentage} status={quotaStatus} />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function AttentionCard({
  item,
  className,
}: {
  item: AttentionItem;
  className?: string;
}) {
  return (
    <Card
      className={cn(
        "border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        className
      )}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <StatusDot status={item.status} />
          {item.title}
        </CardTitle>
        <CardDescription>{item.detail}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div>
          <div className="text-3xl font-semibold tracking-tight">{item.value}</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {item.description}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="mt-auto w-fit">
          <Link href={item.href}>
            {item.actionLabel}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function AIPerformance({ data }: { data: DashboardData }) {
  return (
    <section className="space-y-4" aria-labelledby="ai-performance">
      <SectionHeading
        id="ai-performance"
        title="AI performance"
        description="See how effectively AI is handling customer conversations."
      />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border-border/80 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>AI resolved vs handoff</CardTitle>
            <CardDescription>Share of conversations resolved without a human.</CardDescription>
          </CardHeader>
          <CardContent>
            <AIResolutionChart data={data} />
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle>Top unanswered questions</CardTitle>
            <CardDescription>Knowledge gaps ranked by customer demand.</CardDescription>
          </CardHeader>
          <CardContent>
            <UnansweredQuestions data={data} />
          </CardContent>
        </Card>
      </div>
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Why conversations are being escalated</CardTitle>
          <CardDescription>Root causes behind recent human handoffs.</CardDescription>
        </CardHeader>
        <CardContent>
          <EscalationReasonsChart data={data} />
        </CardContent>
      </Card>
    </section>
  );
}

function AIResolutionChart({ data }: { data: DashboardData }) {
  const hasData =
    data.aiPerformance.aiResolved > 0 || data.aiPerformance.humanHandoff > 0;

  if (!hasData) {
    return (
      <EmptyState
        title="No resolved conversations yet"
        description="AI vs human split appears after chats are marked resolved."
      />
    );
  }

  const chartData = [
    {
      name: "AI resolved",
      value: data.aiPerformance.aiResolved,
      fill: "var(--color-aiResolved)",
    },
    {
      name: "Human handoff",
      value: data.aiPerformance.humanHandoff,
      fill: "var(--color-humanHandoff)",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(180px,1fr)_auto] sm:items-center">
      <ChartContainer
        config={resolutionConfig}
        className="mx-auto aspect-square h-[220px] max-h-[240px]"
      >
        <PieChart accessibilityLayer>
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={86}
            strokeWidth={6}
          >
            <Label
              content={({ viewBox }) => {
                if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;

                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-foreground text-3xl font-semibold"
                    >
                      {data.aiPerformance.aiResolved}%
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) + 22}
                      className="fill-muted-foreground text-xs"
                    >
                      AI resolved
                    </tspan>
                  </text>
                );
              }}
            />
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="space-y-3 text-sm">
        {chartData.map((item) => (
          <div key={item.name} className="flex items-center justify-between gap-6">
            <span className="flex items-center gap-2 text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.fill }} />
              {item.name}
            </span>
            <span className="font-medium tabular-nums">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function UnansweredQuestions({ data }: { data: DashboardData }) {
  const totalOccurrences = data.aiPerformance.unansweredQuestions.reduce(
    (sum, item) => sum + item.occurrences,
    0
  );

  if (data.aiPerformance.unansweredQuestions.length === 0) {
    return <EmptyState title="Great coverage" description="No major unanswered questions detected." />;
  }

  return (
    <div className="divide-y divide-border/70">
      {data.aiPerformance.unansweredQuestions.map((item, index) => {
        // Convert each count into a share so the list can show relative demand.
        const percent = Math.round((item.occurrences / totalOccurrences) * 100);

        return (
          <div key={item.question} className="flex flex-col gap-3 py-4 first:pt-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium leading-6">
                {index + 1}. &quot;{item.question}&quot;
              </p>
              <p className="text-xs text-muted-foreground">
                {item.occurrences} occurrences · {percent}% of gaps
              </p>
            </div>
            <Button asChild variant="ghost" size="sm" className="w-fit">
              <Link href="/dashboard/knowledge">Add to knowledge</Link>
            </Button>
          </div>
        );
      })}
    </div>
  );
}

function EscalationReasonsChart({ data }: { data: DashboardData }) {
  if (data.aiPerformance.escalationReasons.length === 0) {
    return (
      <EmptyState
        title="No escalations in the last 7 days"
        description="When chats are escalated, reasons will show up here."
      />
    );
  }

  const maxPercent = Math.max(
    10,
    ...data.aiPerformance.escalationReasons.map((r) => r.percent)
  );

  return (
    <ChartContainer config={escalationConfig} className="h-[280px] w-full">
      <BarChart
        accessibilityLayer
        data={data.aiPerformance.escalationReasons}
        layout="vertical"
        margin={{ left: 12, right: 24 }}
      >
        <XAxis type="number" hide domain={[0, Math.ceil(maxPercent)]} />
        <YAxis
          dataKey="reason"
          type="category"
          tickLine={false}
          axisLine={false}
          width={110}
          tickMargin={8}
        />
        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
        <Bar dataKey="percent" fill="var(--color-percent)" radius={[0, 6, 6, 0]} barSize={22} />
      </BarChart>
    </ChartContainer>
  );
}

function CustomerPulse({ data }: { data: DashboardData }) {
  return (
    <section className="space-y-4" aria-labelledby="customer-pulse">
      <SectionHeading
        id="customer-pulse"
        title="Customer pulse"
        description={
          data.customerPulse.estimated
            ? "Estimated from recent customer messages (not a formal CSAT survey)."
            : "Understand how customers are feeling about their support experience."
        }
      />
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="border-border/80 shadow-sm lg:col-span-3">
          <CardHeader>
            <CardTitle>Sentiment trend</CardTitle>
            <CardDescription>Last 7 days · keyword estimate</CardDescription>
          </CardHeader>
          <CardContent>
            <SentimentTrend data={data} />
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:col-span-2">
          <FrustratedKeywords data={data} />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <PulseMetric
              title="Repeat Visitors"
              value={data.customerPulse.repeatVisitors.value}
              change={data.customerPulse.repeatVisitors.change}
            />
            <PulseMetric
              title="Reopen Rate"
              value={data.customerPulse.reopenRate.value}
              change={data.customerPulse.reopenRate.change}
              inverted
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SentimentTrend({ data }: { data: DashboardData }) {
  return (
    <ChartContainer config={sentimentConfig} className="h-[310px] w-full">
      <AreaChart accessibilityLayer data={data.customerPulse.sentiment} margin={{ left: 4, right: 10, top: 12 }}>
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={10} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Area type="monotone" dataKey="positive" stroke="var(--color-positive)" fill="var(--color-positive)" fillOpacity={0.14} strokeWidth={2} />
        <Area type="monotone" dataKey="neutral" stroke="var(--color-neutral)" fill="var(--color-neutral)" fillOpacity={0.08} strokeWidth={2} />
        <Area type="monotone" dataKey="negative" stroke="var(--color-negative)" fill="var(--color-negative)" fillOpacity={0.08} strokeWidth={2} />
      </AreaChart>
    </ChartContainer>
  );
}

function FrustratedKeywords({ data }: { data: DashboardData }) {
  return (
    <Card className="border-border/80 shadow-sm">
      <CardHeader>
        <CardTitle>Frustrated keywords</CardTitle>
        <CardDescription>Terms appearing in recent customer messages.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.customerPulse.frustratedKeywords.length === 0 ? (
          <EmptyState
            title="No frustration signals"
            description="Keywords like refund or cancel will appear here when customers mention them."
          />
        ) : (
          data.customerPulse.frustratedKeywords.map((item) => (
            <div
              key={item.keyword}
              className="flex items-center justify-between rounded-lg bg-muted/45 px-3 py-2"
            >
              <span className="text-sm text-foreground">&quot;{item.keyword}&quot;</span>
              <Badge variant="outline" className="bg-brand-orange/10 text-brand-orange">
                {item.count}
              </Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PulseMetric({
  title,
  value,
  change,
  inverted = false,
}: {
  title: string;
  value: string;
  change: string;
  inverted?: boolean;
}) {
  const isNumericDelta = /^[+-]?\d/.test(change.trim());
  const isDown = change.trim().startsWith("-");
  const isPositive = inverted ? isDown : !isDown;
  const TrendIcon = isDown ? TrendingDown : TrendingUp;

  return (
    <Card className="border-border/80 shadow-sm">
      <CardContent className="space-y-3 pt-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {isNumericDelta ? (
          <p
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-brand-orange"
            )}
            title={`${title} changed ${change} from the previous period`}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {change}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">{change}</p>
        )}
      </CardContent>
    </Card>
  );
}

function KnowledgeHealth({ data }: { data: DashboardData }) {
  const knowledge = data.knowledgeHealth;

  return (
    <section className="space-y-4" aria-labelledby="knowledge-health">
      <SectionHeading
        id="knowledge-health"
        title="Knowledge health"
        description="Monitor whether your AI has enough reliable knowledge to answer customers."
      />
      <Card className="border-border/80 shadow-sm">
        <CardContent className="grid gap-6 pt-1 md:grid-cols-4">
          <KnowledgeMetric label="Sources Indexed" value={knowledge.sourcesIndexed.toString()} detail="sources indexed" />
          <KnowledgeMetric label="Chunks Ready" value={knowledge.chunksReady.toLocaleString()} detail="knowledge chunks" />
          <KnowledgeMetric label="Last Crawl" value={knowledge.lastCrawl} detail="latest source sync" />
          <div className="space-y-3">
            <KnowledgeMetric label="FAQ Coverage" value={`${knowledge.faqCoverage}%`} detail="of common questions covered" />
            <ProgressBar value={knowledge.faqCoverage} status="healthy" />
            <p className="text-xs text-muted-foreground">
              {100 - knowledge.faqCoverage}% of common questions may still need knowledge
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/knowledge">Improve coverage</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function KnowledgeMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function QuickActions({ data }: { data: DashboardData }) {
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const handleCopy = async (title: string, value?: string) => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopiedAction(title);
    window.setTimeout(() => setCopiedAction(null), 1600);
  };

  return (
    <section className="space-y-4" aria-labelledby="quick-actions">
      <SectionHeading id="quick-actions" title="Quick actions" description="Common next steps for improving support performance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.quickActions.map((action) => {
          const Icon = action.icon;
          const isCopied = copiedAction === action.title;

          if (action.copyValue) {
            return (
              <button
                key={action.title}
                type="button"
                onClick={() => void handleCopy(action.title, action.copyValue)}
                className="group flex min-h-36 flex-col items-start gap-4 rounded-xl border border-border/80 bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-muted/35 hover:shadow-md"
                aria-label={action.title}
              >
                <QuickActionBody
                  icon={Icon}
                  title={isCopied ? "Embed code copied" : action.title}
                  description={action.description}
                />
              </button>
            );
          }

          return (
            <Link
              key={action.title}
              href={action.href}
              className="group flex min-h-36 flex-col items-start gap-4 rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:bg-muted/35 hover:shadow-md"
            >
              <QuickActionBody icon={Icon} title={action.title} description={action.description} />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function QuickActionBody({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="mt-auto h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </>
  );
}

function SectionHeading({
  id,
  title,
  description,
}: {
  id: string;
  title: string;
  description: string;
}) {
  return (
    <div>
      <h2 id={id} className="text-lg font-semibold tracking-tight">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function ProgressBar({
  value,
  status,
}: {
  value: number;
  status: "healthy" | "warning" | "critical";
}) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
      <div
        className={cn(
          "h-full rounded-full transition-all",
          status === "healthy" && "bg-primary",
          status === "warning" && "bg-brand-orange",
          status === "critical" && "bg-destructive"
        )}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function StatusDot({ status }: { status: "healthy" | "warning" | "critical" }) {
  return (
    <span
      className={cn(
        "h-2.5 w-2.5 rounded-full",
        status === "healthy" && "bg-emerald-500",
        status === "warning" && "bg-brand-orange",
        status === "critical" && "bg-destructive"
      )}
      aria-hidden="true"
    />
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-6 text-center">
      <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-500" />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function DashboardError({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h1 className="mt-4 text-xl font-semibold">Unable to load dashboard data</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {message ?? "Something went wrong while fetching your support metrics."}
      </p>
      <Button onClick={onRetry} className="mt-5">Try again</Button>
    </div>
  );
}

function DashboardHomeSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-72 max-w-[70vw]" />
          <Skeleton className="h-4 w-96 max-w-[80vw]" />
        </div>
        <Skeleton className="hidden h-8 w-44 md:block" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-40 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-48 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl lg:col-span-3" />
      </div>
    </div>
  );
}

function getUsagePercentage(used: number, limit: number) {
  if (limit <= 0) return 0;

  // Calculate how much of the quota has been used.
  return Math.round((used / limit) * 100);
}

function getQuotaStatus(usagePercentage: number) {
  // Determine the semantic status based on usage.
  if (usagePercentage >= 90) return "critical";
  if (usagePercentage >= 70) return "warning";
  return "healthy";
}
