import AppSidebar from "@/app/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import React from "react";

export const metadata = {
  title: "OneMinute Support - Dashboard",
  description: "Instantly resolve customer questions with an assistant that reads your",
};

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const metadataCookie = cookieStore.get("metadata");
  const defaultSidebarOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <div className="min-h-screen bg-background">
      {metadataCookie?.value ? (
        <SidebarProvider defaultOpen={defaultSidebarOpen}>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <SidebarInset className="flex-1">
              <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-border/70 bg-background/82 px-4 backdrop-blur-xl">
                <SidebarTrigger className="-ml-1" />
                <ThemeToggle />
              </header>
              <main className="flex-1">{children}</main>
            </SidebarInset>
          </div>
        </SidebarProvider>
      ) : (
        children
      )}
    </div>
  );
}
