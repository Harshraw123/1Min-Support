import { db } from "@/db/client";
import { knowledge as knowledgeTable } from "@/db/schema";
import { and, inArray, eq } from "drizzle-orm";
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
  const sourceIds = args.sourceIds.filter(Boolean);
  if (sourceIds.length === 0) {
    return { context: "", chunkIds: [], usedRag: false };
  }

  const maxChars = args.maxChars ?? DEFAULT_MAX_CONTEXT_CHARS;
  const query = typeof args.query === "string" ? args.query.trim() : "";

  if (query) {
    const chunks = await retrieveRelevantChunks({
      workspaceId: args.workspaceId,
      query,
      knowledgeSourceIds: sourceIds,
      topK: 8,
      recordUsage: true,
      billable: args.billable ?? false,
    });

    if (chunks.length > 0) {
      return {
        context: formatChunkContext(chunks, maxChars),
        chunkIds: chunks.map((c) => c.id),
        usedRag: true,
      };
    }
  }

  const fullContext = await loadFullKnowledgeContext(args.workspaceId, sourceIds);
  return {
    context: truncateContext(fullContext, maxChars),
    chunkIds: [],
    usedRag: false,
  };
}
