"use client";

import {
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  Bot,
  Settings,
  HelpCircle,
  LogOut,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Conversations", url: "/dashboard/conversations", icon: MessageSquare },
  { title: "Analytics", url: "/dashboard/analytics", icon: BarChart3 },
  { title: "AI Agents", url: "/dashboard/agents", icon: Bot },
];

const supportItems = [
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
  { title: "Help Center", url: "/dashboard/help", icon: HelpCircle },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = usePathname();

  const baseLink =
    "group flex items-center gap-3 rounded-lg px-3 text-sm font-medium text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
  const activeLink = "!bg-primary/10 !text-primary font-semibold shadow-sm";

  const renderItems = (items: typeof mainItems) =>
    items.map((item) => {
      const isActive = pathname === item.url;
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild className="h-10">
            <Link
              href={item.url}
              className={cn(baseLink, isActive && activeLink)}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarContent className="bg-sidebar">
        {/* Brand */}
        <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-brand-orange shadow-md">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="flex flex-col leading-tight animate-fade-in">
                <span className="text-sm font-semibold text-sidebar-foreground">
                  1Min Support
                </span>
                <span className="text-[11px] text-muted-foreground">AI Workspace</span>
              </div>
            )}
          </Link>
        </SidebarHeader>

        {/* Main nav */}
        <SidebarGroup className="px-2 pt-4">
          {!collapsed && (
            <SidebarGroupLabel className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Workspace
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(mainItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Support nav */}
        <SidebarGroup className="px-2 pt-2">
          {!collapsed && (
            <SidebarGroupLabel className="px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Support
            </SidebarGroupLabel>
          )}
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(supportItems)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Upgrade card */}
        {!collapsed && (
          <div className="mx-3 mt-4 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-brand-orange/10 p-4 animate-fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">Upgrade to Pro</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Unlock unlimited AI conversations & advanced analytics.
            </p>
            <button className="mt-3 w-full rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90">
              Upgrade now
            </button>
          </div>
        )}
      </SidebarContent>

      {/* User footer */}
      <SidebarFooter className="border-t border-sidebar-border bg-sidebar p-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 ring-2 ring-primary/20">
            <AvatarFallback className="bg-gradient-to-br from-primary to-brand-orange text-xs font-semibold text-primary-foreground">
              US
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 items-center justify-between animate-fade-in">
              <div className="flex flex-col leading-tight">
                <span className="text-xs font-semibold text-sidebar-foreground">
                  Your Account
                </span>
                <span className="text-[10px] text-muted-foreground">Free plan</span>
              </div>
              <button
                aria-label="Logout"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;