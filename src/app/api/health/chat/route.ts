import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import Groq from "groq-sdk";

type CheckStatus = "ok" | "error" | "missing";

/**
 * Production-safe chat diagnostics — reports config/DB/Groq status without exposing secrets.
 * Hit: GET /api/health/chat
 */
export async function GET() {
  const checks: Record<string, { status: CheckStatus; detail?: string }> = {};

  const groqKey = process.env.GROQ_API_KEY?.trim();
  checks.GROQ_API_KEY = groqKey ? { status: "ok" } : { status: "missing" };

  const dbUrl = process.env.DATABASE_URL?.trim();
  checks.DATABASE_URL = dbUrl ? { status: "ok" } : { status: "missing" };

  const jwtSecret = process.env.JWT_SECRET?.trim();
  checks.JWT_SECRET = jwtSecret ? { status: "ok" } : { status: "missing" };

  if (dbUrl) {
    try {
      await db.execute(sql`select 1 as ok`);
      checks.database_connection = { status: "ok" };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      checks.database_connection = { status: "error", detail };
    }

    try {
      await db.execute(sql`select 1 from conversation limit 0`);
      checks.conversation_table = { status: "ok" };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      checks.conversation_table = {
        status: detail.includes("does not exist") ? "missing" : "error",
        detail,
      };
    }
  }

  if (groqKey) {
    try {
      const groq = new Groq({ apiKey: groqKey });
      const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
      const response = await groq.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Reply with exactly: ok" }],
        max_tokens: 16,
        temperature: 0,
      });
      const text = response.choices[0]?.message?.content?.trim();
      checks.groq_api = text
        ? { status: "ok", detail: `model=${model}` }
        : { status: "error", detail: "Groq returned an empty response" };
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      checks.groq_api = { status: "error", detail };
    }
  }

  const hasError = Object.values(checks).some((c) => c.status !== "ok");
  const hasMissing = Object.values(checks).some((c) => c.status === "missing");

  return NextResponse.json(
    {
      ok: !hasError && !hasMissing,
      environment: process.env.NODE_ENV ?? "unknown",
      checks,
      hint: hasMissing
        ? "Add missing env vars in your hosting dashboard (Vercel → Settings → Environment Variables → Production), then redeploy."
        : hasError
          ? "Fix the failing checks above. For Neon on Vercel, use the pooled DATABASE_URL (-pooler in hostname)."
          : "All chat dependencies look healthy.",
    },
    { status: hasError || hasMissing ? 503 : 200 }
  );
}
