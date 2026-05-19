import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { isMissingRelationError } from "./pgErrors";

let knowledgeChunksReady: boolean | null = null;

export async function isKnowledgeChunksReady(): Promise<boolean> {
  if (knowledgeChunksReady !== null) return knowledgeChunksReady;

  try {
    await db.execute(sql`select 1 from knowledge_chunks limit 0`);
    knowledgeChunksReady = true;
  } catch (error) {
    if (isMissingRelationError(error)) {
      knowledgeChunksReady = false;
    } else {
      throw error;
    }
  }

  return knowledgeChunksReady;
}

export function resetKnowledgeInfraCache() {
  knowledgeChunksReady = null;
}
