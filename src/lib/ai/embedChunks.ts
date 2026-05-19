export const HF_EMBEDDING_MODEL = "BAAI/bge-small-en-v1.5";
export const HF_EMBEDDING_DIMENSIONS = 384;

/** Legacy serverless endpoint (deprecated). */
const HF_LEGACY_EMBEDDING_URL = `https://api-inference.huggingface.co/models/${HF_EMBEDDING_MODEL}`;
/** Current HF Inference router (feature-extraction). */
const HF_ROUTER_EMBEDDING_URL = `https://router.huggingface.co/hf-inference/models/${HF_EMBEDDING_MODEL}`;

const MAX_BATCH_SIZE = 32;

export type EmbedChunksMode = "query" | "passage";

function normalizeChunks(chunks: unknown[]): string[] {
  return chunks
    .map((chunk) => (typeof chunk === "string" ? chunk.trim() : ""))
    .filter(Boolean);
}

function prefixForMode(chunks: string[], mode: EmbedChunksMode): string[] {
  if (mode === "query") {
    return chunks.map((chunk) => (chunk.startsWith("query: ") ? chunk : `query: ${chunk}`));
  }
  return chunks;
}

function parseEmbeddingResponse(value: unknown): number[][] {
  if (!Array.isArray(value)) {
    throw new Error("Hugging Face embedding response was not an array");
  }

  if (value.length === 0) return [];

  if (typeof value[0] === "number") {
    return [value as number[]];
  }

  if (Array.isArray(value[0])) {
    return value as number[][];
  }

  throw new Error("Hugging Face embedding response had an unexpected shape");
}

function validateEmbedding(embedding: number[], index: number) {
  if (embedding.length !== HF_EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding ${index} returned ${embedding.length} dimensions; expected ${HF_EMBEDDING_DIMENSIONS}`
    );
  }

  if (!embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new Error(`Embedding ${index} contains non-numeric values`);
  }
}

async function requestEmbeddings(url: string, chunks: string[], token: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: chunks,
      options: {
        wait_for_model: true,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Hugging Face embedding request failed (${response.status}): ${body.slice(0, 500)}`
    );
  }

  return parseEmbeddingResponse(await response.json());
}

async function embedBatch(chunks: string[], offset: number): Promise<number[][]> {
  const token = process.env.HF_TOKEN;
  if (!token) {
    throw new Error("HF_TOKEN is not configured");
  }

  let parsed: number[][] | null = null;
  let lastError: Error | null = null;

  for (const url of [HF_ROUTER_EMBEDDING_URL, HF_LEGACY_EMBEDDING_URL]) {
    try {
      parsed = await requestEmbeddings(url, chunks, token);
      break;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (url === HF_LEGACY_EMBEDDING_URL) {
        throw lastError;
      }
    }
  }

  if (!parsed) {
    throw lastError ?? new Error("Hugging Face embedding request failed");
  }

  if (parsed.length !== chunks.length) {
    throw new Error(
      `Hugging Face returned ${parsed.length} embeddings for ${chunks.length} chunks`
    );
  }

  parsed.forEach((embedding, index) => validateEmbedding(embedding, offset + index));
  return parsed;
}

export async function embedChunks(
  chunks: string[],
  options?: { mode?: EmbedChunksMode }
): Promise<number[][]> {
  const normalizedChunks = prefixForMode(normalizeChunks(chunks), options?.mode ?? "passage");
  if (normalizedChunks.length === 0) return [];

  const embeddings: number[][] = [];
  for (let index = 0; index < normalizedChunks.length; index += MAX_BATCH_SIZE) {
    const batch = normalizedChunks.slice(index, index + MAX_BATCH_SIZE);
    embeddings.push(...(await embedBatch(batch, index)));
  }

  return embeddings;
}
