"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Mail, User, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type TeamMemberRow = {
  id: string;
  name: string;
  user_email: string;
  role: string;
  status: string;
  created_at: string | null;
};

const TeamSection = () => {
  const [team, setTeam] = useState<TeamMemberRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");

  const fetchTeam = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team/fetch");
      const data = (await res.json().catch(() => ({}))) as {
        team?: TeamMemberRow[];
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.message || "Failed to load team");
      }

      setTeam(Array.isArray(data.team) ? data.team : []);
    } catch (error) {
      console.error("Failed to fetch team:", error);
      setTeam([]);
      toast.error("Could not load team members");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTeam();
  }, [fetchTeam]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();

    const email = newMemberEmail.trim();
    if (!email) {
      toast.error("Email is required");
      return;
    }

    setIsAdding(true);
    try {
      const res = await fetch("/api/team/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: newMemberName.trim(),
        }),
      });

      const result = (await res.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!res.ok) {
        throw new Error(result.message || "Failed to add member");
      }

      toast.success("Invitation sent");
      setNewMemberEmail("");
      setNewMemberName("");
      await fetchTeam();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!memberId || deletingMemberId) return;
    setDeletingMemberId(memberId);

    try {
      const res = await fetch("/api/team/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberId }),
      });

      const result = (await res.json().catch(() => ({}))) as { message?: string };

      if (!res.ok) {
        throw new Error(result.message || "Failed to delete member");
      }

      setTeam((prev) => prev.filter((member) => member.id !== memberId));
      toast.success("Member removed");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not delete team member"
      );
    } finally {
      setDeletingMemberId(null);
    }
  };

  return (
    <Card className="glass overflow-hidden rounded-2xl border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/40  px-5 py-5 sm:px-6">
        <CardTitle className="text-base font-semibold text-foreground">
          Team members
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Invite colleagues to help manage your workspace.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 px-5 py-6 sm:px-6">
        <form
          onSubmit={(e) => void handleAddMember(e)}
          className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="invite-name" className="text-muted-foreground">
              Name
            </Label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-name"
                placeholder="Full name (optional)"
                className="h-10 rounded-xl border-border/60 bg-background/60 pl-10"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                disabled={isAdding}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-email" className="text-muted-foreground">
              Email
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                className="h-10 rounded-xl border-border/60 bg-background/60 pl-10"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                required
                disabled={isAdding}
              />
            </div>
          </div>

          <div className="lg:w-[170px]">
            <Button
              type="submit"
              className="h-10 w-full rounded-xl px-5"
              disabled={isAdding}
            >
              {isAdding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Add member
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Members
          </p>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : team.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border/60 bg-background/30 py-10 text-center text-sm text-muted-foreground">
              No team members yet. Add someone with their email above.
            </p>
          ) : (
            <ul className="space-y-2">
              {team.map((member) => (
                <li
                  key={member.id}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border border-border/50 bg-background/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                      {member.name?.charAt(0).toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {member.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {member.user_email}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {member.role}
                    </span>
                    <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {member.status}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 rounded-lg px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      disabled={deletingMemberId === member.id}
                      onClick={() => void handleDeleteMember(member.id)}
                    >
                      {deletingMemberId === member.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TeamSection;