export type TextChunk = {
  content: string;
  tokenCount: number;
};

const CHARS_PER_TOKEN = 4;

function approximateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
}

function normalizeInput(text: unknown): string {
  if (typeof text !== "string") return "";
  return text.replace(/\r\n/g, "\n").replace(/\s+\n/g, "\n").trim();
}

function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?]+[.!?]+(?:["')\]]+)?|[^.!?]+$/g);
  return (sentences || [normalized])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitOversizedSentence(sentence: string, maxChars: number): string[] {
  if (sentence.length <= maxChars) return [sentence];

  const parts: string[] = [];
  for (let index = 0; index < sentence.length; index += maxChars) {
    const part = sentence.slice(index, index + maxChars).trim();
    if (part) parts.push(part);
  }
  return parts;
}

function buildOverlap(content: string, overlapChars: number): string {
  if (overlapChars <= 0 || content.length <= overlapChars) return "";

  const tail = content.slice(-overlapChars);
  const boundary = tail.search(/[.!?]\s+/);
  if (boundary >= 0 && boundary + 2 < tail.length) {
    return tail.slice(boundary + 2).trim();
  }
  return tail.trim();
}

export function chunkText(
  text: unknown,
  chunkSize = 400,
  overlap = 50
): TextChunk[] {
  try {
    const cleanText = normalizeInput(text);
    if (!cleanText) return [];

    const safeChunkSize = Math.max(50, Math.floor(Number(chunkSize) || 400));
    const safeOverlap = Math.max(0, Math.min(Math.floor(Number(overlap) || 0), safeChunkSize - 1));
    const maxChars = safeChunkSize * CHARS_PER_TOKEN;
    const overlapChars = safeOverlap * CHARS_PER_TOKEN;

    const sentences = splitIntoSentences(cleanText).flatMap((sentence) =>
      splitOversizedSentence(sentence, maxChars)
    );

    const chunks: TextChunk[] = [];
    let current = "";

    for (const sentence of sentences) {
      const candidate = current ? `${current} ${sentence}` : sentence;

      if (candidate.length <= maxChars) {
        current = candidate;
        continue;
      }

      if (current.trim()) {
        const content = current.trim();
        chunks.push({ content, tokenCount: approximateTokens(content) });
        const overlapText = buildOverlap(content, overlapChars);
        current = overlapText ? `${overlapText} ${sentence}` : sentence;
      } else {
        const content = sentence.trim();
        chunks.push({ content, tokenCount: approximateTokens(content) });
        current = "";
      }
    }

    if (current.trim()) {
      const content = current.trim();
      chunks.push({ content, tokenCount: approximateTokens(content) });
    }

    return chunks.filter((chunk) => chunk.content.trim().length > 0);
  } catch (error) {
    console.warn("[CHUNK_TEXT_ERROR]", error);
    return [];
  }
}

export function approximateTokenCount(text: string): number {
  if (!text.trim()) return 0;
  return approximateTokens(text);
}
