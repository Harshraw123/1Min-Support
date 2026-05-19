import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { embedChunks, HF_EMBEDDING_MODEL } from "@/lib/ai/embedChunks";
import { approximateTokenCount } from "@/lib/ai/chunkText";
import { recordUsageEvent } from "@/lib/billing/recordUsageEvent";

export type RetrievedChunk = {
  id: string;
  knowledgeId: string;
  workspaceId: string;
  content: string;
  chunkIndex: number;
  score: number;
};

type ChunkSearchRow = {
  id: string;
  knowledge_id: string;
  workspace_id: string;
  content: string;
  chunk_index: number;
  rank: number;
};

function vectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function rowsFromResult<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (typeof result === "object" && result !== null && "rows" in result) {
    const rows = (result as { rows?: unknown }).rows;
    return Array.isArray(rows) ? (rows as T[]) : [];
  }
  return [];
}

function sourceFilterSql(sourceIds: string[]) {
  if (sourceIds.length === 0) return sql``;
  return sql`and knowledge_id in (${sql.join(
    sourceIds.map((id) => sql`${id}`),
    sql`, `
  )})`;
}

function reciprocalRankFusion(vectorRows: ChunkSearchRow[], keywordRows: ChunkSearchRow[]) {
  const combined = new Map<string, RetrievedChunk>();

  const addRows = (rows: ChunkSearchRow[]) => {
    rows.forEach((row, index) => {
      const existing = combined.get(row.id);
      const score = 1 / (60 + index + 1);
      if (existing) {
        existing.score += score;
        return;
      }

      combined.set(row.id, {
        id: row.id,
        knowledgeId: row.knowledge_id,
        workspaceId: row.workspace_id,
        content: row.content,
        chunkIndex: row.chunk_index,
        score,
      });
    });
  };

  addRows(vectorRows);
  addRows(keywordRows);

  return [...combined.values()].sort((a, b) => b.score - a.score);
}

async function searchVectorChunks(args: {
  workspaceId: string;
  queryEmbedding: number[];
  sourceIds: string[];
  limit: number;
}): Promise<ChunkSearchRow[]> {
  const queryVector = vectorLiteral(args.queryEmbedding);
  const sourceFilter = sourceFilterSql(args.sourceIds);

  const vectorResult = await db.execute<{ rows: ChunkSearchRow[] }>(sql`
    select
      id,
      knowledge_id,
      workspace_id,
      content,
      chunk_index,
      row_number() over (order by embedding <=> ${queryVector}::vector) as rank
    from knowledge_chunks
    where workspace_id = ${args.workspaceId}
      and embedding is not null
      ${sourceFilter}
    order by embedding <=> ${queryVector}::vector
    limit ${args.limit}
  `);

  return rowsFromResult<ChunkSearchRow>(vectorResult);
}

async function searchKeywordChunks(args: {
  workspaceId: string;
  query: string;
  sourceIds: string[];
  limit: number;
}): Promise<ChunkSearchRow[]> {
  const sourceFilter = sourceFilterSql(args.sourceIds);

  const keywordResult = await db.execute<{ rows: ChunkSearchRow[] }>(sql`
    select
      id,
      knowledge_id,
      workspace_id,
      content,
      chunk_index,
      row_number() over (order by similarity(content, ${args.query}) desc) as rank
    from knowledge_chunks
    where workspace_id = ${args.workspaceId}
      ${sourceFilter}
      and content % ${args.query}
    order by similarity(content, ${args.query}) desc
    limit ${args.limit}
  `);

  return rowsFromResult<ChunkSearchRow>(keywordResult);
}

export async function retrieveRelevantChunks(args: {
  workspaceId: string;
  query: string;
  knowledgeSourceIds?: string[];
  topK?: number;
  recordUsage?: boolean;
  billable?: boolean;
}): Promise<RetrievedChunk[]> {
  const query = typeof args.query === "string" ? args.query.trim() : "";
  if (!query) return [];

  const topK = Math.max(1, Math.min(args.topK ?? 8, 20));
  const sourceIds = (args.knowledgeSourceIds || []).filter(Boolean);
  const searchLimit = topK * 2;

  let vectorRows: ChunkSearchRow[] = [];

  if (process.env.HF_TOKEN) {
    try {
      const embeddings = await embedChunks([query], { mode: "query" });
      const queryEmbedding = embeddings[0];
      if (queryEmbedding) {
        vectorRows = await searchVectorChunks({
          workspaceId: args.workspaceId,
          queryEmbedding,
          sourceIds,
          limit: searchLimit,
        });
      }
    } catch (error) {
      console.error("[RETRIEVAL_EMBEDDING_ERROR]", error);
    }
  }

  let keywordRows: ChunkSearchRow[] = [];
  try {
    keywordRows = await searchKeywordChunks({
      workspaceId: args.workspaceId,
      query,
      sourceIds,
      limit: searchLimit,
    });
  } catch (error) {
    console.error("[RETRIEVAL_KEYWORD_ERROR]", error);
  }

  const chunks = reciprocalRankFusion(vectorRows, keywordRows).slice(0, topK);

  if (args.recordUsage) {
    await recordUsageEvent({
      workspace_id: args.workspaceId,
      event_type: "retrieval_query",
      provider: "huggingface",
      model: HF_EMBEDDING_MODEL,
      embedding_tokens: approximateTokenCount(query),
      chunk_count: chunks.length,
      metadata: {
        topK,
        sourceIds,
        vectorHits: vectorRows.length,
        keywordHits: keywordRows.length,
      },
      billable: args.billable ?? false,
    });
  }

  return chunks;
}
