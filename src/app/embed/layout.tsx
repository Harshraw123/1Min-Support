import React from "react";
import { Inter } from "next/font/google";
import "./embed-scope.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Chatbot Embed",
  description: "AI Powered Customer Care Chatbot",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main
      data-embed-widget-root
      style={{ colorScheme: "light dark" }}
      className={`${inter.className} h-screen w-screen flex flex-col justify-end items-end overflow-hidden bg-transparent text-foreground antialiased`}
    >
      {children}
    </main>
  );
}
