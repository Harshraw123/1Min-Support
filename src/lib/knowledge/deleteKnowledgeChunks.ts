import { db } from "@/db/client";
import { knowledge_chunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isMissingRelationError } from "@/lib/db/pgErrors";

export async function deleteKnowledgeChunks(knowledgeId: string) {
  try {
    await db.delete(knowledge_chunks).where(eq(knowledge_chunks.knowledge_id, knowledgeId));
  } catch (error) {
    if (isMissingRelationError(error)) return;
    throw error;
  }
}
