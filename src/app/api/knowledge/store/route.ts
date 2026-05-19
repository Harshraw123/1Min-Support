import { NextRequest, NextResponse } from "next/server";
import {
  cleanContentWithUsage,
  summarizeMarkdownWithUsage,
  type GroqTokenUsage,
} from "@/lib/ai/aiSummarize";
import { chunkText, approximateTokenCount, type TextChunk } from "@/lib/ai/chunkText";
import {
  embedChunks,
  HF_EMBEDDING_DIMENSIONS,
  HF_EMBEDDING_MODEL,
} from "@/lib/ai/embedChunks";
import { db } from "@/db/client";
import { knowledge as knowledgeTable, knowledge_chunks as knowledgeChunksTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth/getSession";
import { deleteKnowledgeChunks } from "@/lib/knowledge/deleteKnowledgeChunks";
import { recordUsageEvent } from "@/lib/billing/recordUsageEvent";
import { checkUsageLimit } from "@/lib/billing/checkUsageLimit";

const MODEL_NAME = "llama-3.3-70b-versatile";

// Safe char limit to stay under Groq free tier (12k TPM)
// ~5000 chars is roughly 1250 tokens plus prompt and response budget.
const MAX_INPUT_CHARS = 5000;

type KnowledgeFlow = "upload" | "website" | "text";

type PreparedKnowledge = {
  formattedContent: string;
  cleanMarkdown: string;
  chunks: TextChunk[];
  embeddings: number[][] | null;
  embeddingError: string | null;
  tokenUsage: {
    summarize: GroqTokenUsage;
    clean: GroqTokenUsage;
    embedding: {
      provider: "huggingface";
      model: string;
      dimensions: number;
      chunkCount: number;
      embeddingTokens: number;
      failed: boolean;
      error?: string;
    };
  };
};

function buildMetaData(meta: Record<string, unknown>) {
  // Knowledge source import context DB meta_data me safe shape me store hota hai.
  return meta;
}

function usageMetadata(usage: GroqTokenUsage) {
  return {
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    totalTokens: usage.totalTokens,
    model: usage.model,
    provider: usage.provider,
  };
}

async function prepareKnowledgeArtifacts(args: {
  rawContent: string;
  summarizeInstruction?: string;
  summarizeMaxInputChars?: number;
  summarizeMaxCompletionTokens?: number;
}): Promise<PreparedKnowledge> {
  const summarizeResult = await summarizeMarkdownWithUsage(args.rawContent, {
    taskInstruction: args.summarizeInstruction,
    maxInputChars: args.summarizeMaxInputChars,
    maxCompletionTokens: args.summarizeMaxCompletionTokens,
  });

  const cleanResult = await cleanContentWithUsage(args.rawContent);
  const chunks = chunkText(cleanResult.markdown);
  const embeddingTokens = chunks.reduce((total, chunk) => total + chunk.tokenCount, 0);

  let embeddings: number[][] | null = null;
  let embeddingError: string | null = null;

  if (chunks.length > 0) {
    try {
      embeddings = await embedChunks(chunks.map((chunk) => chunk.content));
    } catch (error) {
      embeddingError = error instanceof Error ? error.message : "Unknown embedding error";
      console.error("[EMBEDDING_ERROR]", error);
    }
  }

  return {
    formattedContent: summarizeResult.markdown,
    cleanMarkdown: cleanResult.markdown,
    chunks,
    embeddings,
    embeddingError,
    tokenUsage: {
      summarize: summarizeResult.usage,
      clean: cleanResult.usage,
      embedding: {
        provider: "huggingface",
        model: HF_EMBEDDING_MODEL,
        dimensions: HF_EMBEDDING_DIMENSIONS,
        chunkCount: chunks.length,
        embeddingTokens,
        failed: Boolean(embeddingError),
        ...(embeddingError ? { error: embeddingError } : {}),
      },
    },
  };
}

async function storeKnowledgeChunks(args: {
  knowledgeId: string;
  workspaceId: string;
  chunks: TextChunk[];
  embeddings: number[][] | null;
}) {
  if (args.chunks.length === 0) return;

  await db.insert(knowledgeChunksTable).values(
    args.chunks.map((chunk, index) => ({
      knowledge_id: args.knowledgeId,
      workspace_id: args.workspaceId,
      chunk_index: index,
      content: chunk.content,
      embedding: args.embeddings?.[index] ?? null,
      token_count: chunk.tokenCount,
    }))
  );
}

async function saveKnowledgeWithChunks(args: {
  knowledgeValues: typeof knowledgeTable.$inferInsert;
  prepared: PreparedKnowledge;
  flow: KnowledgeFlow;
  workspaceId: string;
  rawContent: string;
}) {
  const [inserted] = await db.insert(knowledgeTable).values(args.knowledgeValues).returning();

  try {
    await storeKnowledgeChunks({
      knowledgeId: inserted.id,
      workspaceId: args.workspaceId,
      chunks: args.prepared.chunks,
      embeddings: args.prepared.embeddings,
    });
    await recordKnowledgeUsage({
      flow: args.flow,
      workspaceId: args.workspaceId,
      knowledgeId: inserted.id,
      rawContent: args.rawContent,
      prepared: args.prepared,
    });
    return inserted;
  } catch (error) {
    await deleteKnowledgeChunks(inserted.id).catch((cleanupError) => {
      console.error("[CHUNK_CLEANUP_ERROR]", cleanupError);
    });
    await db.delete(knowledgeTable).where(eq(knowledgeTable.id, inserted.id));
    throw error;
  }
}

async function recordKnowledgeUsage(args: {
  flow: KnowledgeFlow;
  workspaceId: string;
  knowledgeId: string;
  rawContent: string;
  prepared: PreparedKnowledge;
}) {
  const { prepared } = args;

  await recordUsageEvent({
    workspace_id: args.workspaceId,
    knowledge_id: args.knowledgeId,
    event_type: "knowledge_ingest",
    provider: "internal",
    total_tokens: approximateTokenCount(args.rawContent),
    metadata: {
      flow: args.flow,
      rawLength: args.rawContent.length,
    },
    billable: true,
  });

  await recordUsageEvent({
    workspace_id: args.workspaceId,
    knowledge_id: args.knowledgeId,
    event_type: "content_summarize",
    provider: "groq",
    model: prepared.tokenUsage.summarize.model,
    prompt_tokens: prepared.tokenUsage.summarize.promptTokens,
    completion_tokens: prepared.tokenUsage.summarize.completionTokens,
    total_tokens: prepared.tokenUsage.summarize.totalTokens,
    metadata: {
      flow: args.flow,
    },
    billable: true,
  });

  await recordUsageEvent({
    workspace_id: args.workspaceId,
    knowledge_id: args.knowledgeId,
    event_type: "content_clean",
    provider: "groq",
    model: prepared.tokenUsage.clean.model,
    prompt_tokens: prepared.tokenUsage.clean.promptTokens,
    completion_tokens: prepared.tokenUsage.clean.completionTokens,
    total_tokens: prepared.tokenUsage.clean.totalTokens,
    metadata: {
      flow: args.flow,
      cleanLength: prepared.cleanMarkdown.length,
    },
    billable: true,
  });

  await recordUsageEvent({
    workspace_id: args.workspaceId,
    knowledge_id: args.knowledgeId,
    event_type: "embedding_generate",
    provider: "huggingface",
    model: HF_EMBEDDING_MODEL,
    embedding_tokens: prepared.tokenUsage.embedding.embeddingTokens,
    chunk_count: prepared.chunks.length,
    metadata: {
      flow: args.flow,
      dimensions: HF_EMBEDDING_DIMENSIONS,
      failed: Boolean(prepared.embeddingError),
      error: prepared.embeddingError,
    },
    billable: true,
  });

  await recordUsageEvent({
    workspace_id: args.workspaceId,
    knowledge_id: args.knowledgeId,
    event_type: "chunk_store",
    provider: "internal",
    embedding_tokens: prepared.tokenUsage.embedding.embeddingTokens,
    chunk_count: prepared.chunks.length,
    metadata: {
      flow: args.flow,
      embedded: Boolean(prepared.embeddings),
    },
    billable: true,
  });
}

export async function POST(req: NextRequest) {
  // Knowledge store endpoint upload, website aur text teen flows handle karta hai.
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

    // TODO: flip enforce to true when plan policy is ready for ingestion.
    await checkUsageLimit({ workspace_id: workspaceId, enforce: false }).catch((error) => {
      console.error("[USAGE_LIMIT_CHECK_ERROR]", error);
    });

    const contentType = req.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");

    // FILE UPLOAD HANDLING
    if (isFormData) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { message: "No file provided" },
          { status: 400 }
        );
      }

      const rawText = await file.text();
      const prepared = await prepareKnowledgeArtifacts({
        rawContent: rawText,
        summarizeInstruction:
          file.type === "application/pdf" || file.name.endsWith(".pdf")
            ? "Extract and deeply summarize this PDF content into structured markdown:"
            : undefined,
        summarizeMaxInputChars:
          file.type === "application/pdf" || file.name.endsWith(".pdf")
            ? MAX_INPUT_CHARS
            : undefined,
        summarizeMaxCompletionTokens:
          file.type === "application/pdf" || file.name.endsWith(".pdf")
            ? 4096
            : undefined,
      });

      const inserted = await saveKnowledgeWithChunks({
        knowledgeValues: {
          title: file.name || "Uploaded File",
          content: prepared.formattedContent || `[PDF content from: ${file.name}]`,
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
            tokenUsage: {
              summarize: usageMetadata(prepared.tokenUsage.summarize),
              clean: usageMetadata(prepared.tokenUsage.clean),
              embedding: prepared.tokenUsage.embedding,
            },
            chunkCount: prepared.chunks.length,
            createdAt: new Date().toISOString(),
          }),
        },
        prepared,
        flow: "upload",
        workspaceId,
        rawContent: rawText,
      });

      return NextResponse.json(inserted, { status: 201 });
    }

    // JSON BODY HANDLING
    const body = await req.json();

    const { type, content, title, url, websiteUrl, textTitle, textContent } =
      body ?? {};

    const finalUrl = url || websiteUrl;
    const finalTitle = title || textTitle;
    const finalContent = content || textContent;

    // WEBSITE SCRAPING FLOW
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

      const prepared = await prepareKnowledgeArtifacts({
        rawContent: rawMarkdown,
        summarizeInstruction:
          "Refine this scraped markdown into clean, structured markdown:",
        summarizeMaxInputChars: MAX_INPUT_CHARS,
        summarizeMaxCompletionTokens: 4096,
      });

      const inserted = await saveKnowledgeWithChunks({
        knowledgeValues: {
          title: finalTitle || finalUrl,
          content: prepared.formattedContent,
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
            tokenUsage: {
              summarize: usageMetadata(prepared.tokenUsage.summarize),
              clean: usageMetadata(prepared.tokenUsage.clean),
              embedding: prepared.tokenUsage.embedding,
            },
            chunkCount: prepared.chunks.length,
            createdAt: new Date().toISOString(),
          }),
        },
        prepared,
        flow: "website",
        workspaceId,
        rawContent: rawMarkdown,
      });

      return NextResponse.json(inserted, { status: 201 });
    }

    // TEXT INPUT FLOW
    if (type === "text") {
      if (!finalContent || !finalTitle) {
        return NextResponse.json(
          { message: "Title and content are required for text type" },
          { status: 400 }
        );
      }

      const prepared = await prepareKnowledgeArtifacts({
        rawContent: finalContent,
      });

      const inserted = await saveKnowledgeWithChunks({
        knowledgeValues: {
          title: finalTitle,
          content: prepared.formattedContent,
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
            tokenUsage: {
              summarize: usageMetadata(prepared.tokenUsage.summarize),
              clean: usageMetadata(prepared.tokenUsage.clean),
              embedding: prepared.tokenUsage.embedding,
            },
            chunkCount: prepared.chunks.length,
            createdAt: new Date().toISOString(),
          }),
        },
        prepared,
        flow: "text",
        workspaceId,
        rawContent: finalContent,
      });

      return NextResponse.json(inserted, { status: 201 });
    }

    return NextResponse.json(
      { message: `Unsupported knowledge type: "${type}"` },
      { status: 400 }
    );
  } catch (error) {
    console.error("[KNOWLEDGE_STORE_ERROR]", error);

    const message = error instanceof Error ? error.message : "";
    if (message.includes("knowledge_chunks") || message.includes("vector")) {
      return NextResponse.json(
        {
          message:
            "Knowledge was processed but chunk storage failed. Ensure database migrations are applied.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
