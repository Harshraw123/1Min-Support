import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // never hardcode in production
});

const MODEL_NAME = "llama-3.3-70b-versatile";
const DEFAULT_MAX_INPUT_CHARS = 15000;

export type GroqTokenUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  model: string;
  provider: "groq";
};

export type MarkdownTaskResult = {
  markdown: string;
  usage: GroqTokenUsage;
  truncated: boolean;
};

// Raw content ko support-friendly structured markdown me convert karne ka base prompt.
export const SUMMARIZE_PROMPT = `
You are a knowledge base assistant. Your job is to convert raw content into clean, structured markdown.

Rules:
- Remove all HTML tags, scripts, styles, nav menus, footers, cookie banners, and ads
- Keep only the meaningful, informative content
- Structure it with clear headings (##), bullet points, and short paragraphs
- If it's a CSV or table, convert it into a readable markdown table
- If it's code, preserve it in code blocks
- Summarize repetitive content — don't repeat the same point twice
- Max output: 1500 words. Be concise but complete.
- Output ONLY the markdown. No preamble, no "Here is the summary", just the content.
`;

export const CLEAN_CONTENT_PROMPT = `
Remove all HTML, scripts, nav, footer, ads, cookie banners.
Keep ALL meaningful content intact — do not summarize or compress.
Fix formatting, convert to clean markdown. Output only markdown.
`;

function emptyUsage(): GroqTokenUsage {
  return {
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    model: MODEL_NAME,
    provider: "groq",
  };
}

function extractUsage(response: {
  usage?: {
    prompt_tokens?: number | null;
    completion_tokens?: number | null;
    total_tokens?: number | null;
  } | null;
}): GroqTokenUsage {
  return {
    promptTokens: response.usage?.prompt_tokens ?? null,
    completionTokens: response.usage?.completion_tokens ?? null,
    totalTokens: response.usage?.total_tokens ?? null,
    model: MODEL_NAME,
    provider: "groq",
  };
}

async function runMarkdownTask(
  rawContent: string,
  promptTemplate: string,
  options?: {
    taskInstruction?: string;
    maxInputChars?: number;
    maxCompletionTokens?: number;
    logPrefix?: string;
  }
): Promise<MarkdownTaskResult> {
  // Groq se raw website/file/text content ka compact markdown summary banata hai.
  try {
    if (!rawContent || rawContent.trim().length === 0) {
      return { markdown: "", usage: emptyUsage(), truncated: false };
    }

    const maxInputChars = options?.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS;

    const truncatedContent =
      rawContent.length > maxInputChars
        ? rawContent.slice(0, maxInputChars) + "\n\n[Content truncated...]"
        : rawContent;
    const wasTruncated = rawContent.length > maxInputChars;

    // Token limit safe rakhne ke liye pehle content trim, phir model call hota hai.
    const prompt = `${promptTemplate}
${options?.taskInstruction ? `\n${options.taskInstruction}` : ""}

---

RAW CONTENT:
${truncatedContent}`;

    const chatCompletion = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: options?.maxCompletionTokens ?? 2048,
      top_p: 1,
      stream: false,
    });

    const markdown = chatCompletion.choices[0]?.message?.content || "";
    const usage = extractUsage(chatCompletion);

    if (!markdown.trim()) {
      console.warn(`${options?.logPrefix ?? "[SUMMARIZE]"} Groq returned empty response, using raw content`);
      return { markdown: truncatedContent, usage, truncated: wasTruncated };
    }

    return { markdown: markdown.trim(), usage, truncated: wasTruncated };
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? (error as { status?: unknown }).status
        : undefined;

    if (status === 429) {
      console.warn(`${options?.logPrefix ?? "[SUMMARIZE]"} Groq rate limit hit — returning raw content`);
      return {
        markdown: rawContent.slice(0, options?.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS),
        usage: emptyUsage(),
        truncated: rawContent.length > (options?.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS),
      };
    }

    console.error(`${options?.logPrefix ?? "[SUMMARIZE_ERROR]"}`, error);
    return {
      markdown: rawContent.slice(0, options?.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS),
      usage: emptyUsage(),
      truncated: rawContent.length > (options?.maxInputChars ?? DEFAULT_MAX_INPUT_CHARS),
    };
  }
}

export async function summarizeMarkdownWithUsage(
  rawContent: string,
  options?: {
    taskInstruction?: string;
    maxInputChars?: number;
    maxCompletionTokens?: number;
  }
): Promise<MarkdownTaskResult> {
  return runMarkdownTask(rawContent, SUMMARIZE_PROMPT, {
    ...options,
    logPrefix: "[SUMMARIZE]",
  });
}

export async function summarizeMarkdown(rawContent: string): Promise<string> {
  const result = await summarizeMarkdownWithUsage(rawContent);
  return result.markdown;
}

export async function cleanContentWithUsage(rawContent: string): Promise<MarkdownTaskResult> {
  return runMarkdownTask(rawContent, CLEAN_CONTENT_PROMPT, {
    maxInputChars: 30000,
    maxCompletionTokens: 4096,
    logPrefix: "[CLEAN_CONTENT]",
  });
}

export async function cleanContent(rawContent: string): Promise<string> {
  const result = await cleanContentWithUsage(rawContent);
  return result.markdown;
}
