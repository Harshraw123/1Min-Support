import { Groq } from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // never hardcode in production
});

const MODEL_NAME = "llama-3.3-70b-versatile";

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

export async function summarizeMarkdown(rawContent: string): Promise<string> {
  try {
    if (!rawContent || rawContent.trim().length === 0) {
      return "";
    }

    const MAX_INPUT_CHARS = 15000;

    const truncatedContent =
      rawContent.length > MAX_INPUT_CHARS
        ? rawContent.slice(0, MAX_INPUT_CHARS) + "\n\n[Content truncated...]"
        : rawContent;

    const prompt = `${SUMMARIZE_PROMPT}\n\n---\n\nRAW CONTENT:\n${truncatedContent}`;

    const chatCompletion = await groq.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_completion_tokens: 2048,
      top_p: 1,
      stream: false,
    });

    const markdown = chatCompletion.choices[0]?.message?.content || "";

    console.log("ai result", markdown);

    if (!markdown.trim()) {
      console.warn("[SUMMARIZE] Groq returned empty response, using raw content");
      return truncatedContent;
    }

    return markdown.trim();
  } catch (error: any) {
    if (error?.status === 429) {
      console.warn("[SUMMARIZE] Groq rate limit hit — returning raw content");
      return rawContent.slice(0, 15000);
    }

    console.error("[SUMMARIZE_ERROR]", error);
    return rawContent.slice(0, 15000);
  }
}