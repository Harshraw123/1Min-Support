"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  UserPlus,
  CheckCircle2,
  RotateCcw,
  Hand,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FilterKey =
  | "all"
  | "active"
  | "escalated"
  | "unassigned"
  | "mine"
  | "human_handling"
  | "resolved";

type ConversationSummary = {
  id: string;
  status: string;
  handlingMode: string;
  name: string | null;
  lastCustomerMessage: string | null;
  escalationReason: string | null;
  escalationSummary: string | null;
  escalatedAt: string | null;
  priority: string;
  assignedAgentEmail: string | null;
  assignedAgentName: string | null;
  lastMessageAt: string | null;
  createdAt: string | null;
};

type ThreadMessage = {
  id: string;
  role: "user" | "assistant" | "agent" | "system";
  content: string;
  senderName: string | null;
  senderEmail: string | null;
  createdAt: string | null;
};

type TeamMember = {
  id: string;
  name: string;
  user_email: string;
  role: string;
  status: string;
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "escalated", label: "Escalated" },
  { key: "unassigned", label: "Unassigned" },
  { key: "mine", label: "Mine" },
  { key: "human_handling", label: "Human handling" },
  { key: "resolved", label: "Resolved" },
];

function statusTone(status: string): string {
  switch (status) {
    case "escalated":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "human_handling":
      return "bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30";
    case "resolved":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

function relativeTime(value: string | null) {
  if (!value) return "";
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "";
  }
}

function newClientId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export default function ConversationsInbox() {
  const searchParams = useSearchParams();
  const initialFilter = (() => {
    const raw = searchParams.get("filter");
    const allowed = new Set(FILTERS.map((f) => f.key));
    return raw && allowed.has(raw as FilterKey) ? (raw as FilterKey) : "all";
  })();
  const [filter, setFilter] = useState<FilterKey>(initialFilter);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [escalatedCount, setEscalatedCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [assignTarget, setAssignTarget] = useState<string>("");
  const [reply, setReply] = useState("");
  const [listLoading, setListLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      const data = await res.json();
      const email =
        data?.user?.email || data?.email || data?.user?.user?.email || null;
      setSessionEmail(typeof email === "string" ? email.toLowerCase() : null);
    } catch {
      setSessionEmail(null);
    }
  }, []);

  const loadTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/team/fetch");
      const data = await res.json();
      setTeam(Array.isArray(data.team) ? data.team : []);
    } catch {
      setTeam([]);
    }
  }, []);

  const loadList = useCallback(async () => {
    setListLoading(true);
    try {
      const params = new URLSearchParams({ filter });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/conversations?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load conversations");
      const rows = Array.isArray(data.conversations) ? data.conversations : [];
      setConversations(rows);
      setEscalatedCount(Number(data?.meta?.escalatedCount ?? 0));
      setSelectedId((prev) => {
        if (prev && rows.some((r: ConversationSummary) => r.id === prev)) return prev;
        return rows[0]?.id ?? null;
      });
    } catch (error) {
      console.error(error);
      toast.error("Could not load conversations");
      setConversations([]);
    } finally {
      setListLoading(false);
    }
  }, [filter, debouncedSearch]);

  const loadThread = useCallback(async (id: string) => {
    setThreadLoading(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load conversation");
      setThread(data.conversation);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (error) {
      console.error(error);
      toast.error("Could not load conversation");
      setThread(null);
      setMessages([]);
    } finally {
      setThreadLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
    void loadTeam();
  }, [loadSession, loadTeam]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setThread(null);
      setMessages([]);
      return;
    }
    void loadThread(selectedId);
  }, [selectedId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, threadLoading]);

  // Light polling so the queue stays fresh while agents work.
  useEffect(() => {
    const interval = window.setInterval(() => {
      void loadList();
      if (selectedId) void loadThread(selectedId);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [loadList, loadThread, selectedId]);

  const isMine = useMemo(() => {
    if (!thread || !sessionEmail) return false;
    return thread.assignedAgentEmail?.toLowerCase() === sessionEmail;
  }, [thread, sessionEmail]);

  const canReply =
    thread &&
    thread.status !== "resolved" &&
    (!thread.assignedAgentEmail || isMine);

  async function runAction(
    key: string,
    fn: () => Promise<Response>,
    successMessage: string
  ) {
    setActionLoading(key);
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.message === "string" ? data.message : "Action failed"
        );
      }
      toast.success(successMessage);
      await loadList();
      if (selectedId) await loadThread(selectedId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  }

  const handleTake = () => {
    if (!selectedId) return;
    void runAction(
      "take",
      () => fetch(`/api/conversations/${selectedId}/take`, { method: "POST" }),
      "You took this conversation"
    );
  };

  const handleAssign = () => {
    if (!selectedId || !assignTarget) return;
    void runAction(
      "assign",
      () =>
        fetch(`/api/conversations/${selectedId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId: assignTarget }),
        }),
      "Conversation assigned"
    );
  };

  const handleResolve = () => {
    if (!selectedId) return;
    void runAction(
      "resolve",
      () => fetch(`/api/conversations/${selectedId}/resolve`, { method: "POST" }),
      "Conversation resolved"
    );
  };

  const handleReopen = () => {
    if (!selectedId) return;
    void runAction(
      "reopen",
      () =>
        fetch(`/api/conversations/${selectedId}/reopen`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferHuman: true }),
        }),
      "Conversation reopened"
    );
  };

  const handleSend = async () => {
    if (!selectedId || !reply.trim() || !canReply) return;
    const content = reply.trim();
    const clientMessageId = newClientId();
    setReply("");
    setActionLoading("reply");
    try {
      const res = await fetch(`/api/conversations/${selectedId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, clientMessageId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.message === "string" ? data.message : "Send failed");
      }
      await loadThread(selectedId);
      await loadList();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Send failed");
      setReply(content);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] min-h-[560px] flex-col gap-0 overflow-hidden border border-border  md:rounded-xl">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Conversations</h2>
          <p className="text-xs text-muted-foreground">
            AI handles what it can. Escalations wait in queue until an agent takes them.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {escalatedCount > 0 ? (
            <Badge variant="outline" className={statusTone("escalated")}>
              {escalatedCount} escalated
            </Badge>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadList()}
            disabled={listLoading}
          >
            <RefreshCw className={cn("h-4 w-4", listLoading && "animate-spin")} />
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left: filters + list */}
        <div className="flex min-h-0 flex-col border-b border-border md:border-b-0 md:border-r">
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search conversations"
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                    filter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <ScrollArea className="min-h-0 flex-1">
            {listLoading && conversations.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading…
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium">No conversations yet</p>
                <p className="text-xs text-muted-foreground">
                  Widget chats and escalations will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {conversations.map((c) => {
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={cn(
                          "w-full px-3 py-3 text-left transition-colors hover:bg-muted/60",
                          active && "bg-muted"
                        )}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium">
                            {c.name || c.assignedAgentName || "Visitor"}
                          </span>
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {relativeTime(c.lastMessageAt)}
                          </span>
                        </div>
                        <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">
                          {c.lastCustomerMessage || c.escalationSummary || "No messages yet"}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={cn(
                              "rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                              statusTone(c.status)
                            )}
                          >
                            {formatStatus(c.status)}
                          </span>
                          {c.assignedAgentName ? (
                            <span className="text-[10px] text-muted-foreground">
                              {c.assignedAgentName}
                            </span>
                          ) : c.status === "escalated" ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">
                              Unassigned
                            </span>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </ScrollArea>
        </div>

        {/* Right: thread */}
        <div className="flex min-h-0 flex-col">
          {!selectedId ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a conversation
            </div>
          ) : threadLoading && !thread ? (
            <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading thread…
            </div>
          ) : thread ? (
            <>
              <div className="space-y-3 border-b border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold">
                        {thread.name || "Visitor"}
                      </h3>
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                          statusTone(thread.status)
                        )}
                      >
                        {formatStatus(thread.status)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {thread.handlingMode} mode
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Agent:{" "}
                      {thread.assignedAgentName ||
                        thread.assignedAgentEmail ||
                        "Unassigned"}
                      {thread.priority && thread.priority !== "NORMAL"
                        ? ` · Priority ${thread.priority}`
                        : ""}
                      {thread.escalatedAt
                        ? ` · Escalated ${relativeTime(thread.escalatedAt)}`
                        : ""}
                    </p>
                    {thread.escalationReason ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reason:{" "}
                        <span className="font-medium text-foreground">
                          {thread.escalationReason}
                        </span>
                        {thread.escalationSummary
                          ? ` — ${thread.escalationSummary}`
                          : ""}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {thread.status !== "resolved" && !isMine ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleTake}
                        disabled={actionLoading === "take"}
                      >
                        {actionLoading === "take" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Hand className="h-4 w-4" />
                        )}
                        Take
                      </Button>
                    ) : null}
                    {thread.status === "resolved" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleReopen}
                        disabled={actionLoading === "reopen"}
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reopen
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleResolve}
                        disabled={actionLoading === "resolve"}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>

                {thread.status !== "resolved" ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Select value={assignTarget} onValueChange={setAssignTarget}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Assign to agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {team
                          .filter((m) =>
                            ["accepted", "active"].includes(m.status.toLowerCase())
                          )
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} ({m.user_email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={handleAssign}
                      disabled={!assignTarget || actionLoading === "assign"}
                    >
                      <UserPlus className="h-4 w-4" />
                      Assign
                    </Button>
                  </div>
                ) : null}
              </div>

              <ScrollArea className="min-h-0 flex-1 px-4 py-4">
                <div className="mx-auto flex max-w-3xl flex-col gap-3">
                  {messages.map((m) => {
                    if (m.role === "system") {
                      return (
                        <div
                          key={m.id}
                          className="mx-auto max-w-[90%] rounded-md border border-dashed border-border bg-muted/40 px-3 py-1.5 text-center text-[11px] text-muted-foreground"
                        >
                          {m.content}
                        </div>
                      );
                    }

                    const isCustomer = m.role === "user";
                    const isAgent = m.role === "agent";
                    const label = isCustomer
                      ? "Customer"
                      : isAgent
                        ? m.senderName || "Agent"
                        : "AI";

                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "flex flex-col gap-1",
                          isCustomer ? "items-end" : "items-start"
                        )}
                      >
                        <span className="px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                          {label}
                        </span>
                        <div
                          className={cn(
                            "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                            isCustomer && "bg-primary text-primary-foreground",
                            m.role === "assistant" && "bg-muted text-foreground",
                            isAgent &&
                              "border border-sky-500/30 bg-sky-500/10 text-foreground"
                          )}
                        >
                          {m.role === "assistant"
                            ? m.content.replace(/\[\[\s*ESCALATE\b[\s\S]*?\]\]\s*/gi, "").trim() ||
                              m.content
                            : m.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-border p-3">
                {thread.status === "resolved" ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Resolved. Reopen to continue messaging the customer.
                  </p>
                ) : !canReply ? (
                  <p className="text-center text-xs text-muted-foreground">
                    Take this conversation before replying so AI and agents do not conflict.
                  </p>
                ) : (
                  <div className="mx-auto flex max-w-3xl gap-2">
                    <Input
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Reply as support agent…"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void handleSend();
                        }
                      }}
                      disabled={actionLoading === "reply"}
                    />
                    <Button
                      type="button"
                      onClick={() => void handleSend()}
                      disabled={!reply.trim() || actionLoading === "reply"}
                    >
                      {actionLoading === "reply" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Conversation not found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
