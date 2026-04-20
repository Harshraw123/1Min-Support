import AppSidebar from "@/app/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";
import React from "react";

export const metadata = {
  title: "OneMinute Support - Dashboard",
  description: "Instantly resolve customer questions with an assistant that reads your",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const metadataCookie = cookieStore.get("metadata");

  return (
    <div className="min-h-screen bg-slate-50">
      {metadataCookie?.value ? (
        <SidebarProvider>
          <div className="flex min-h-screen w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col relative min-h-screen transition-all duration-300">
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </SidebarProvider>
      ) : (
        children
      )}
    </div>
  );
}