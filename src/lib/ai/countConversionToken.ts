// Token counting utility for Llama 3 models (via Groq)
// Llama uses a SentencePiece tokenizer — tiktoken is OpenAI-specific and inaccurate here.
// For context-window budgeting, a character-based approximation is standard practice:
// Llama 3 averages ~4 chars per token (similar to GPT models in English).

const CHARS_PER_TOKEN = 4;

// Overhead per message: role label + structural formatting tokens (conservative estimate)
const TOKENS_PER_MESSAGE = 4;

// Priming tokens for the assistant reply turn
const REPLY_PRIME_TOKENS = 3;

/**
 * Estimates token count for a single string.
 * Useful for measuring individual messages or knowledge source chunks.
 */
export function countTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Estimates total tokens for a full conversation array.
 * Includes per-message overhead to mirror how Llama 3 structures chat turns.
 *
 * Llama 3 context window: 8,192 tokens (llama3-8b-8192 on Groq)
 * Keep total usage comfortably under that limit.
 */
export function countConversationTokens(
  messages: { role: string; content: string }[]
): number {
  if (!messages?.length) return 0;

  let totalTokens = REPLY_PRIME_TOKENS;

  for (const message of messages) {
    totalTokens += TOKENS_PER_MESSAGE;
    totalTokens += countTokens(message.content ?? "");
    totalTokens += countTokens(message.role); // typically 1 token, but consistent
  }

  return totalTokens;
}