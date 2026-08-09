import React from "react";
import { Inter } from "next/font/google";
import EmbedThemeProvider from "./embed-theme-provider";
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
    <EmbedThemeProvider>
      <main
        data-embed-widget-root
        style={{ colorScheme: "normal", background: "transparent" }}
        className={`${inter.className} h-screen w-screen flex flex-col justify-end items-end overflow-hidden bg-transparent antialiased`}
      >
        {children}
      </main>
    </EmbedThemeProvider>
  );
}
