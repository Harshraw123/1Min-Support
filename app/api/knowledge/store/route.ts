import { NextRequest, NextResponse } from "next/server";
import { summarizeMarkdown, SUMMARIZE_PROMPT } from "@/lib/aiSummarize";
import { db } from "@/db/client";
import { knowledge as knowledgeTable } from "@/db/schema";
import { getSession } from "@/lib/getSession";
import { extractStructuredContent } from "@/lib/extractStructuredContent";
import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL_NAME = "llama-3.3-70b-versatile";

export async function POST(req: NextRequest) {
  try {
    const user = await getSession();

    if (!user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = user.organization_id ?? "";

    const contentType = req.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");

    // ═══════════════════════════════════════
    // FILE UPLOAD HANDLING
    // ═══════════════════════════════════════
    if (isFormData) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { message: "No file provided" },
          { status: 400 }
        );
      }

      let formattedContent = "";

      // ─────────────────────────────
      // PDF HANDLING (GROQ ONLY)
      // ─────────────────────────────
      if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        try {
          const rawText = await file.text();

          const prompt = `${SUMMARIZE_PROMPT}

Extract and deeply summarize this PDF content into structured markdown:

${rawText}`;

          const result = await groq.chat.completions.create({
            model: MODEL_NAME,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            max_completion_tokens: 4096,
          });

          formattedContent =
            result.choices[0]?.message?.content?.trim() ||
            `[PDF content from: ${file.name}]`;
        } catch (error) {
          console.error("[PDF_ERROR]", error);

          formattedContent = `[PDF uploaded: ${file.name} — processing failed]`;
        }
      } else {
        const rawText = await file.text();
        formattedContent = await summarizeMarkdown(rawText);
      }

      const [inserted] = await db
        .insert(knowledgeTable)
        .values({
          title: file.name || "Uploaded File",
          content: formattedContent,
          type: "upload",
          user_email: user.email,
          workspace_id: workspaceId,
        })
        .returning();

      return NextResponse.json(inserted, { status: 201 });
    }

    // ═══════════════════════════════════════
    // JSON BODY HANDLING
    // ═══════════════════════════════════════
    const body = await req.json();

    const {
      type,
      content,
      title,
      url,
      websiteUrl,
      textTitle,
      textContent,
    } = body ?? {};

    const finalUrl = url || websiteUrl;
    const finalTitle = title || textTitle;
    const finalContent = content || textContent;

    // ─────────────────────────────
    // WEBSITE SCRAPING FLOW
    // ─────────────────────────────
    if (type === "website") {
      if (!finalUrl) {
        return NextResponse.json(
          { message: "URL is required for website type" },
          { status: 400 }
        );
      }

      const encodedUrl = encodeURIComponent(finalUrl);

      const scrapeRes = await fetch(
        `https://api.scrape.do?token=${process.env.SCRAPE_DO_TOKEN}&url=${encodedUrl}`
      );

      if (!scrapeRes.ok) {
        return NextResponse.json(
          { message: `Scraping failed with status ${scrapeRes.status}` },
          { status: 502 }
        );
      }

      const rawHtml = await scrapeRes.text();

      const extracted = extractStructuredContent(rawHtml);

      const prompt = `${SUMMARIZE_PROMPT}

Convert this structured web content into clean markdown:

${extracted.structured}`;

      const result = await groq.chat.completions.create({
        model: MODEL_NAME,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_completion_tokens: 4096,
      });

      const formattedContent =
        result.choices[0]?.message?.content?.trim() || "";

      const [inserted] = await db
        .insert(knowledgeTable)
        .values({
          title: finalTitle || finalUrl,
          content: formattedContent,
          type: "website",
          source_url: finalUrl,
          user_email: user.email,
          workspace_id: workspaceId,
        })
        .returning();

      return NextResponse.json(inserted, { status: 201 });
    }

    // ─────────────────────────────
    // TEXT INPUT FLOW
    // ─────────────────────────────
    if (type === "text") {
      if (!finalContent || !finalTitle) {
        return NextResponse.json(
          { message: "Title and content are required for text type" },
          { status: 400 }
        );
      }

      const formattedContent = await summarizeMarkdown(finalContent);

      const [inserted] = await db
        .insert(knowledgeTable)
        .values({
          title: finalTitle,
          content: formattedContent,
          type: "text",
          user_email: user.email,
          workspace_id: workspaceId,
        })
        .returning();

      return NextResponse.json(inserted, { status: 201 });
    }

    // ─────────────────────────────
    // FALLBACK
    // ─────────────────────────────
    return NextResponse.json(
      { message: `Unsupported knowledge type: "${type}"` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[KNOWLEDGE_STORE_ERROR]", error);

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}