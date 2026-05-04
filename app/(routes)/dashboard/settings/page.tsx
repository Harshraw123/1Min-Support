"use client";

import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import TeamSection from "@/app/components/TeamSection";

type Organization = {
  id: string | null;
  name: string | null;
  website_url: string | null;
  external_links: string | null;
};

const SettingPage = () => {
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/organization/fetch", {
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => ({}))) as {
          organization?: Organization;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(data.error || "Failed to load settings");
        }

        setOrganization(data.organization ?? null);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        console.error("Settings fetch error:", error);
        toast.error("Failed to load settings");
      } finally {
        setLoading(false);
      }
    };

    void fetchSettings();

    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Loading settings…
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-8 p-4 md:p-8 max-w-6xl mx-auto animate-in fade-in duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Workspace details and team access.
        </p>
      </div>

      <Card className="glass overflow-hidden rounded-2xl border-border/60 shadow-sm">
        <CardHeader className="border-b border-border/40  px-5 py-5 sm:px-6">
          <CardTitle className="text-lg font-semibold text-foreground">
            Workspace
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Pulled from your onboarding metadata (read-only).
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5 py-6 sm:px-6">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Workspace name</Label>
              <Input
                readOnly
                value={organization?.name ?? "—"}
                className="h-10 rounded-xl border-border/60 bg-background/60 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Primary website</Label>
              <Input
                readOnly
                value={organization?.website_url ?? "—"}
                className="h-10 rounded-xl border-border/60 bg-background/60 text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Organization ID</Label>
              <Input
                readOnly
                value={organization?.id ?? "—"}
                className="h-10 rounded-xl border-border/60 bg-background/60 font-mono text-xs text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">Default language</Label>
              <Input
                readOnly
                value="English"
                className="h-10 rounded-xl border-border/60 bg-background/60 text-foreground"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <TeamSection />
    </div>
  );
};

export default SettingPage;