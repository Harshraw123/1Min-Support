import { NextRequest, NextResponse } from "next/server";
import { summarizeMarkdown, SUMMARIZE_PROMPT } from "@/lib/ai/aiSummarize";
import { db } from "@/db/client";
import { knowledge as knowledgeTable } from "@/db/schema";
import { getSession } from "@/lib/auth/getSession";
import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

const MODEL_NAME = "llama-3.3-70b-versatile";

// ✅ Safe char limit to stay under Groq free tier (12k TPM)
// ~5000 chars ≈ 1250 tokens + prompt (~200) + response (4096) = ~5546 total
const MAX_INPUT_CHARS = 5000;

function buildMetaData(meta: Record<string, unknown>) {
  return meta;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const userEmail = session?.email?.trim() || session?.user?.email?.trim();
    const workspaceId =
      typeof session?.organization_id === "string" &&
      session.organization_id.trim()
        ? session.organization_id.trim()
        : null;

    if (!userEmail) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    if (!workspaceId) {
      return NextResponse.json(
        { message: "Missing workspace context (organization_id)" },
        { status: 400 }
      );
    }

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

          // ✅ FIX: Truncate PDF text before sending to Groq
          const safeText =
            rawText.length > MAX_INPUT_CHARS
              ? rawText.slice(0, MAX_INPUT_CHARS) + "\n\n[Content truncated...]"
              : rawText;

          const prompt = `${SUMMARIZE_PROMPT}

Extract and deeply summarize this PDF content into structured markdown:

${safeText}`;

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
          status: "active",
          workspace_id: workspaceId,
          meta_data: buildMetaData({
            flow: "upload",
            file: {
              name: file.name,
              type: file.type,
              size: file.size,
            },
            model: MODEL_NAME,
            createdAt: new Date().toISOString(),
          }),
        })
        .returning();

      return NextResponse.json(inserted, { status: 201 });
    }

    // ═══════════════════════════════════════
    // JSON BODY HANDLING
    // ═══════════════════════════════════════
    const body = await req.json();

    const { type, content, title, url, websiteUrl, textTitle, textContent } =
      body ?? {};

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

      const scrapeToken = process.env.SCRAPE_DO_TOKEN;
      if (!scrapeToken) {
        return NextResponse.json(
          { message: "Missing SCRAPE_DO_TOKEN" },
          { status: 500 }
        );
      }

      const scrapeUrl = new URL("https://api.scrape.do/");
      scrapeUrl.searchParams.set("token", scrapeToken);
      scrapeUrl.searchParams.set("url", finalUrl);
      scrapeUrl.searchParams.set("output", "markdown");

      const scrapeRes = await fetch(scrapeUrl.toString(), {
        method: "GET",
      });

      if (!scrapeRes.ok) {
        return NextResponse.json(
          { message: `Scraping failed with status ${scrapeRes.status}` },
          { status: 502 }
        );
      }

      const rawMarkdown = (await scrapeRes.text()).trim();
      if (!rawMarkdown) {
        return NextResponse.json(
          { message: "Scraping returned empty content" },
          { status: 502 }
        );
      }

      // ✅ FIX: Truncate scraped markdown before sending to Groq
      const safeMarkdown =
        rawMarkdown.length > MAX_INPUT_CHARS
          ? rawMarkdown.slice(0, MAX_INPUT_CHARS) + "\n\n[Content truncated...]"
          : rawMarkdown;

      const prompt = `${SUMMARIZE_PROMPT}

Refine this scraped markdown into clean, structured markdown:

${safeMarkdown}`;

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
          status: "active",
          source_url: finalUrl,
          workspace_id: workspaceId,
          meta_data: buildMetaData({
            flow: "website",
            url: finalUrl,
            scrapeProvider: "scrape.do",
            scrapeOutput: "markdown",
            extracted: {
              markdownLength: rawMarkdown.length,
              truncated: rawMarkdown.length > MAX_INPUT_CHARS,
            },
            model: MODEL_NAME,
            createdAt: new Date().toISOString(),
          }),
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
          status: "active",
          workspace_id: workspaceId,
          meta_data: buildMetaData({
            flow: "text",
            input: {
              titleLength: finalTitle.length,
              contentLength: finalContent.length,
            },
            model: MODEL_NAME,
            createdAt: new Date().toISOString(),
          }),
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
