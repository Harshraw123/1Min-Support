import React from "react";

export const metadata = {
  title: "OneMinute Support - Dashboard",
  description:
    "Instantly resolve customer questions with an assistant that reads your",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}