import { db } from "@/db/client";
import { knowledge_chunks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function deleteKnowledgeChunks(knowledgeId: string) {
  await db.delete(knowledge_chunks).where(eq(knowledge_chunks.knowledge_id, knowledgeId));
}
