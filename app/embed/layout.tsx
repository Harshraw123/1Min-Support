import React from "react";
import { Inter } from "next/font/google";

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
    <html lang="en">
      <body
        className={`${inter.className} bg-transparent antialiased`}
        style={{
          margin: 0,
          padding: 0,
          overflow: "hidden", // Prevents double scrollbars in the iframe
        }}
      >
        {/* The wrapper div ensures the content can handle 
            the dark theme correctly if specified in the page.tsx 
        */}
        <main className="h-screen w-screen flex flex-col justify-end items-end">
          {children}
        </main>
      </body>
    </html>
  );
}