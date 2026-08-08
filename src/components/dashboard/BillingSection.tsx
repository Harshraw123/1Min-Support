"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Loader2, Sparkles, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type BillingStatus = {
  plan: {
    slug: "free" | "pro";
    name: string;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  };
  usage: {
    aiMessagesUsed: number;
    aiMessagesLimit: number;
    remaining: number;
    yearMonth: string;
  };
  checkoutAvailable: boolean;
  lemonConfigured: boolean;
};

function formatDate(value: string | null) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

export default function BillingSection() {
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/billing/status");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Failed to load billing");
      }
      setStatus(data as BillingStatus);
    } catch (error) {
      console.error(error);
      toast.error("Could not load billing status");
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || "Checkout failed");
      }
      if (typeof data.url === "string" && data.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("Checkout URL missing");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upgrade failed");
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading billing…
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  const used = status.usage.aiMessagesUsed;
  const limit = Math.max(1, status.usage.aiMessagesLimit);
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const periodEnd = formatDate(status.plan.currentPeriodEnd);
  const isPro = status.plan.slug === "pro";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              Plan &amp; usage
            </CardTitle>
            <CardDescription>
              Simple monthly AI message limits keep support costs predictable and stop abuse.
            </CardDescription>
          </div>
          <Badge variant={isPro ? "default" : "secondary"}>
            {status.plan.name}
            {status.plan.status && status.plan.status !== "free"
              ? ` · ${status.plan.status}`
              : ""}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">AI messages this month</span>
            <span className="font-medium tabular-nums">
              {used.toLocaleString()} / {limit.toLocaleString()}
            </span>
          </div>
          <Progress value={pct} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {status.usage.remaining.toLocaleString()} remaining · period {status.usage.yearMonth}
            {periodEnd ? ` · renews/ends ${periodEnd}` : ""}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Free includes {100} AI replies/month. Pro includes {5000}. Dashboard test chat does not
          count. Human-handover messages still save when AI is paused.
        </div>

        <div className="flex flex-wrap gap-2">
          {!isPro ? (
            <Button
              type="button"
              onClick={() => void handleUpgrade()}
              disabled={upgrading || !status.lemonConfigured}
            >
              {upgrading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
              Upgrade to Pro
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              You&apos;re on Pro
              {status.plan.cancelAtPeriodEnd ? " (cancels at period end)" : ""}.
            </p>
          )}
          {!status.lemonConfigured ? (
            <p className="w-full text-xs text-amber-700 dark:text-amber-400">
              Lemon Squeezy env vars are not configured yet — upgrade checkout is disabled.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
