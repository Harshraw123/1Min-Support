import { db } from "@/db/client";
import { knowledge as knowledgeTable } from "@/db/schema";
import { and, inArray, eq } from "drizzle-orm";
import { isKnowledgeChunksReady } from "@/lib/db/knowledgeInfra";
import { retrieveRelevantChunks } from "./retrieveRelevantChunks";

const DEFAULT_MAX_CONTEXT_CHARS = 12_000;

function truncateContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n\n[Context truncated…]`;
}

function formatChunkContext(
  chunks: { id: string; content: string }[],
  maxChars: number
): string {
  const parts: string[] = [];
  let used = 0;

  for (const chunk of chunks) {
    const block = chunk.content.trim();
    if (!block) continue;

    const separator = parts.length === 0 ? "" : "\n\n---\n\n";
    if (used + separator.length + block.length > maxChars) break;
    parts.push(block);
    used += separator.length + block.length;
  }

  return truncateContext(parts.join("\n\n---\n\n"), maxChars);
}

async function loadFullKnowledgeContext(
  workspaceId: string,
  sourceIds: string[]
): Promise<string> {
  const sources = await db
    .select({ content: knowledgeTable.content })
    .from(knowledgeTable)
    .where(
      and(eq(knowledgeTable.workspace_id, workspaceId), inArray(knowledgeTable.id, sourceIds))
    );

  return sources
    .map((s) => s.content)
    .filter(Boolean)
    .join("\n\n");
}

export async function buildKnowledgeContextForChat(args: {
  workspaceId: string;
  sourceIds: string[];
  query: string;
  maxChars?: number;
  billable?: boolean;
}): Promise<{ context: string; chunkIds: string[]; usedRag: boolean }> {
  try {
    const sourceIds = args.sourceIds.filter(Boolean);
    if (sourceIds.length === 0) {
      return { context: "", chunkIds: [], usedRag: false };
    }

    const maxChars = args.maxChars ?? DEFAULT_MAX_CONTEXT_CHARS;
    const query = typeof args.query === "string" ? args.query.trim() : "";

    let chunksReady = false;
    try {
      chunksReady = await isKnowledgeChunksReady();
    } catch (infraError) {
      console.warn("[KNOWLEDGE_INFRA_CHECK_FAILED]", infraError);
      chunksReady = false;
    }

    if (query && chunksReady) {
      try {
        const chunks = await retrieveRelevantChunks({
          workspaceId: args.workspaceId,
          query,
          knowledgeSourceIds: sourceIds,
          topK: 8,
        });

        if (chunks.length > 0) {
          return {
            context: formatChunkContext(chunks, maxChars),
            chunkIds: chunks.map((c) => c.id),
            usedRag: true,
          };
        }
      } catch (retrievalError) {
        console.warn("[RETRIEVE_RELEVANT_CHUNKS_FAILED]", retrievalError);
      }
    }

    try {
      const fullContext = await loadFullKnowledgeContext(args.workspaceId, sourceIds);
      return {
        context: truncateContext(fullContext, maxChars),
        chunkIds: [],
        usedRag: false,
      };
    } catch (loadError) {
      console.warn("[LOAD_FULL_KNOWLEDGE_CONTEXT_FAILED]", loadError);
      return {
        context: "",
        chunkIds: [],
        usedRag: false,
      };
    }
  } catch (err) {
    console.error("[BUILD_KNOWLEDGE_CONTEXT_CRITICAL_ERROR]", err);
    return {
      context: "",
      chunkIds: [],
      usedRag: false,
    };
  }
}
