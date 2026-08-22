# Challenges & Bugs Fixed — Interview Notes

This document summarizes real problems encountered while building the **embeddable chat widget** (`/embed`, `public/widget.js`) and related flows, and how they were resolved. Use these as concrete stories in interviews.

---

## System overview: what I built

This project is a **workspace-based AI customer support SaaS**. A business can create a chatbot, add knowledge sources, configure sections / AI behavior, and embed a support widget on its own website.

**Core workflow:**

```txt
Dashboard user
  -> creates chatbot / sections
  -> ingests knowledge from upload, website, or text
  -> content is summarized for UI
  -> content is cleaned, chunked, embedded, and stored for future RAG
  -> widget script is embedded on customer site
  -> visitor chats with widget
  -> backend verifies widget JWT
  -> shared AI completion path answers from workspace knowledge
  -> usage events are recorded for billing and analytics
```

**Architecture choices:**

- **Next.js App Router** for dashboard, embed UI, and API routes.
- **Drizzle ORM + PostgreSQL / Neon** for app data.
- **pgvector inside Postgres** for embeddings, instead of Pinecone / Weaviate / Qdrant.
- **Groq SDK with `llama-3.3-70b-versatile`** for summarization, cleaning, and chat completions.
- **Hugging Face `BAAI/bge-small-en-v1.5`** for 384-dimensional embeddings.
- **Workspace isolation through `session.organization_id`**.
- **Widget auth through signed JWT**, separate from dashboard session auth.
- **Append-only usage events** as the foundation for usage-based billing.

**High-signal interview line:** *“I built a multi-tenant AI support system with two auth boundaries: dashboard users use session-based workspace identity, while public embed visitors use widget JWTs. The same AI logic is shared behind both paths, and ingestion prepares data for scalable RAG without adding an external vector database.”*

---

## RAG architecture: current and prepared path

The current chat flow still preserves the tested behavior by loading selected knowledge content into the prompt, but the ingestion pipeline now prepares a scalable RAG path.

**Ingestion path:**

```txt
Raw source
  -> summarizeMarkdown()
  -> store compact summary in knowledge.content
  -> cleanContent()
  -> chunkText()
  -> embedChunks()
  -> store chunks in knowledge_chunks
  -> record usage_events
```

**Why two AI content steps exist:**

- `summarizeMarkdown()` creates compact, human-friendly content for the dashboard UI.
- `cleanContent()` keeps meaningful content intact for retrieval.
- This avoids using a short summary as the only retrieval source.

**Retrieval-ready storage:**

```txt
knowledge
  - id
  - workspace_id
  - title
  - content                 # compact summary for UI
  - type
  - source_url
  - meta_data.tokenUsage

knowledge_chunks
  - id
  - knowledge_id
  - workspace_id
  - chunk_index
  - content                 # cleaned full-content chunk
  - embedding vector(384)
  - token_count
```

**Future retrieval plan:**

- Embed user query.
- Search `knowledge_chunks` with pgvector similarity.
- Search text with `pg_trgm` keyword similarity.
- Merge both rankings with Reciprocal Rank Fusion.
- Return top chunks to the chat prompt.
- Keep optional reranking isolated for later.

**Interview line:** *“I kept the production chat behavior stable, but changed ingestion so every source is retrieval-ready. The system now has chunked content, 384-dimensional embeddings, pgvector storage, keyword search support, and usage tracking before switching chat fully to chunk retrieval.”*

---

## 1. Embed / test page showed “nothing” (no bubble, no iframe)

**Symptom:** The chatbot test page or exported embed appeared blank; users saw no launcher.

**Root cause:**

- `public/widget.js` calls `POST /api/widget/session` with the widget id from `data-id`.
- The test page used a **hardcoded UUID** that did **not** exist in `chat_bot_metadata`, so the API returned **404**, the script aborted, and **no iframe** was ever created (failure happened before `/embed` loaded).

**Fix:**

- Test page became a **client** flow: `GET /api/chatbot/metadata/fetch` (authenticated) to read the **real `widgetId`**, then inject `<Script src="/widget.js" data-id={widgetId} />`.
- Use **relative** `/widget.js` so any dev port or production host works without rewriting `localhost:3000`.

**Interview line:** *“I traced a silent failure path: the loader never mounted the iframe because session creation failed; I replaced a static id with metadata-driven configuration and made the script URL origin-safe.”*

---

## 2. Dashboard AI worked; embed chat did not

**Symptom:** Chat on the dashboard chatbot page returned real AI replies; the same product in the iframe only showed a generic placeholder.

**Root cause:**

- `components/chat/ChatContainer.tsx` used a **`setTimeout` mock** and never called the backend.
- `/api/chat/test` requires a **logged-in session** (`getSession()` + `organization_id`). Embed visitors only have a **widget JWT**, not dashboard cookies.

**Fix:**

- Extracted shared Groq + RAG logic into **`lib/chat/workspaceChatCompletion.ts`**.
- Added **`POST /api/widget/chat`**: verifies `Authorization: Bearer <widget JWT>`, reads `chatbotId` from the token, runs the same completion path as the dashboard.
- Default **section** for embed: first section by `created_at` when the UI does not send `section_id` (embed has no section picker).
- **`ChatContainer`** now calls `/api/widget/chat` with the bearer token and real message history.

**Interview line:** *“I separated authenticated ‘builder’ chat from public ‘widget’ chat: shared business logic, two auth boundaries—session cookies vs signed JWT—and a sensible default for section context in the embed.”*

---

## 3. Next.js dev UI overlapped the widget (floating “N”)

**Symptom:** Extra Next.js branding / dev controls appeared on top of the widget during local testing.

**Root cause:** Next.js **dev indicators** (development-only overlay).

**Fix:** `devIndicators: false` in `next.config.ts`.

**Interview line:** *“I disabled dev-only UI so local embed testing matches what customers see in production.”*

---

## 4. Dark / light theme for third-party embeds

**Symptom:** Widget should look correct on arbitrary customer sites and respect light/dark expectations.

**Context:**

- `next-themes` toggles a **`.dark` class** on `<html>`, but **Tailwind v4** defaults to media-based `dark:` unless configured.

**Fix:**

- `@custom-variant dark (&:where(.dark, .dark *));` in `app/globals.css` so `dark:` utilities follow **class-based** theme.
- Added a **`.dark`** token block for semantic colors.
- **`public/widget.js`**: optional `data-theme="light" | "dark" | "system"`; if omitted, infer from host `html` classes then `prefers-color-scheme`; pass theme via URL + `postMessage` `INIT`.
- **`app/embed/page.tsx`**: `useTheme()` + URL / `INIT` handling.

**Interview line:** *“I aligned Tailwind v4 with next-themes class strategy and added a host-aware theme contract for the script tag so the iframe matches customer branding rules.”*

---

## 5. “Host CSS bleeding into the widget” (myth vs reality)

**Claim (often repeated):** Parent page global CSS (`a { color: red }`, etc.) overrides the widget inside the iframe.

**Reality in this architecture:** The widget loads in an **iframe** whose document is served from **your origin**. Parent stylesheets **do not cascade** into that document. Misdiagnosing this leads to unnecessary `all: revert` hacks that **fight Tailwind**.

**What we still added (defensive, not for parent bleed):**

- `app/embed/embed-scope.css` + `data-embed-widget-root` on embed layout: **isolation**, predictable **link / form** baselines using **design tokens**, for future rich content (e.g. markdown links).

**Interview line:** *“I verified the iframe boundary first—parent CSS can’t cross documents—then added scoped embed defaults for future content without breaking the design system.”*

---

## 6. Widget session and domain checks

**Symptom / risk:** Edge cases around `allowed_domain` and missing `Origin` header.

**Fix:** Session route aligned with config route: only enforce domain match when **`origin` is present** (`bot.allowed_domain && origin && origin !== bot.allowed_domain`), avoiding false **403**s when `Origin` is absent.

**Interview line:** *“I tightened CORS/domain logic so legitimate requests weren’t rejected when the browser didn’t send Origin.”*

---

## 7. Knowledge ingestion was compact for UI, but weak for retrieval

**Symptom:** The dashboard needed compact knowledge content for humans, but retrieval needs richer full content. If we only store summaries, the chatbot can miss details from the original source.

**Root cause:**

- `summarizeMarkdown()` intentionally compresses raw upload / website / text content.
- That summary is good for UI display, but it is not ideal as the only source for embeddings and future RAG.
- Mixing summary and retrieval content would either bloat the UI or weaken search quality.

**Fix:**

- Kept `summarizeMarkdown(rawContent)` unchanged for existing behavior.
- Added `cleanContent(rawContent)` as a separate AI step: remove HTML, scripts, nav, footer, ads, and cookie banners, but keep all meaningful content intact.
- Store the summary in `knowledge.content` exactly as before.
- Use cleaned markdown only for chunking and embeddings.

**Interview line:** *“I separated human-facing compact summaries from retrieval-facing cleaned full content, so the UI stays simple while RAG keeps access to richer source material.”*

---

## 8. Full knowledge context does not scale for chat

**Symptom / risk:** The chat path loaded entire selected knowledge documents into the model prompt. This works early, but becomes expensive and eventually hits context limits as customers add more sources.

**Root cause:**

- The old path injected `knowledge.content` directly into the system prompt.
- There was no chunk table, no vector index, and no hybrid retrieval helper yet.
- Replacing it all at once could break existing widget and dashboard chat behavior.

**Fix:**

- Added `knowledge_chunks` with `embedding vector(384)` using pgvector.
- Added chunking with approximate token sizing, sentence-boundary preference, and overlap.
- Added Hugging Face embeddings with `BAAI/bge-small-en-v1.5`, which returns 384-dimensional vectors.
- Added a future retrieval helper that prepares vector search + `pg_trgm` keyword search + Reciprocal Rank Fusion.
- Kept old full-context behavior active until retrieval quality is tested.

**Interview line:** *“I built the scalable retrieval path behind the current behavior: pgvector chunks and hybrid-search preparation are ready, but the production chat flow remains stable until retrieval is validated.”*

---

## 9. Why I used pgvector instead of Pinecone / Weaviate / Qdrant

**Problem / decision:** The app needs vector search for knowledge retrieval, but adding a separate vector database would increase infrastructure, cost, and sync complexity.

**Context:**

- The app already uses PostgreSQL through Drizzle.
- Knowledge rows, workspace identity, sections, and billing data already live in Postgres.
- Embeddings are tightly linked to `knowledge_id` and `workspace_id`.
- A separate vector DB would require keeping Postgres rows and vector records in sync.

**Solution:**

- Used **pgvector inside PostgreSQL** instead of an external vector database.
- Added `knowledge_chunks.embedding vector(384)`.
- Used `vector(384)` because `BAAI/bge-small-en-v1.5` returns **384-dimensional embeddings**, not 1536.
- Kept chunks and embeddings in the same database as knowledge and workspace data.
- Added `pg_trgm` too, so future retrieval can combine vector similarity with keyword search.

**What this means:**

```txt
Database: PostgreSQL / Neon
Vector search: pgvector extension inside Postgres
External vector DB: not used
```

**Why this is better for this stage:**

- Simpler deployment.
- No extra vendor to manage.
- No duplicate data pipeline.
- Easier workspace filtering with `workspace_id`.
- Easier joins with `knowledge`, `sections`, and billing tables.
- Good enough scalability for an MVP / early SaaS before introducing more infrastructure.

**Interview line:** *“I didn’t add an external vector database. I used pgvector inside PostgreSQL, so embeddings stay in the same transactional database as knowledge and workspace data. It keeps infrastructure simpler and avoids syncing data between Postgres and a separate vector store.”*

---

## 10. Embedding failures could break ingestion

**Symptom / risk:** If Hugging Face is unavailable, rate-limited, or returns an invalid embedding shape, a knowledge source upload could fail even though summarization and source storage succeeded.

**Root cause:**

- Embeddings are an external network dependency.
- The embedding dimension must match `vector(384)`.
- Treating embeddings as mandatory would make ingestion fragile.

**Fix:**

- Batch chunks in one Hugging Face request where possible.
- Validate every embedding is exactly 384 dimensions.
- Log `[EMBEDDING_ERROR]` and record a failed usage event when embedding fails.
- Continue the main response and store the knowledge row, so users do not lose their source.

**Interview line:** *“I made embeddings best-effort for Phase 1: strict validation and observability, but no user-facing ingestion failure when the external embedding provider has a problem.”*

---

## 11. No audit trail for usage-based billing

**Symptom / risk:** The app could call Groq, Hugging Face, and internal ingestion flows, but there was no append-only billing record to answer: who used what, which section caused cost, and what should be billable.

**Root cause:**

- Token usage lived only inside individual API responses or logs.
- There was no shared usage table, no plan/subscription schema, and no section-level usage tracking.
- Billing enforcement added too early could accidentally block existing users.

**Fix:**

- Added `plans`, `workspace_subscriptions`, `usage_events`, and `usage_daily_rollups`.
- Made `usage_events` the append-only source of truth.
- Added `recordUsageEvent()` that never crashes the main user flow by default.
- Added `checkUsageLimit()` and plan lookup helpers with enforcement disabled unless a caller explicitly enables it.
- Recorded ingestion, cleaning, summarization, embedding, chunk storage, and chat completion usage.
- Added `section_id` to billable AI calls when available for future section-wise analytics.

**Interview line:** *“I designed billing as an observability layer first: append-only raw events, fast daily rollups later, and non-blocking enforcement hooks so we can turn quotas on safely.”*

---

## Quick “stack” checklist for this feature

| Area              | Pieces touched                                      |
|-------------------|-----------------------------------------------------|
| Loader            | `public/widget.js`, `/api/widget/session`         |
| Embed UI          | `app/embed/page.tsx`, `app/embed/layout.tsx`      |
| Public chat API   | `app/api/widget/chat/route.ts`                    |
| Shared AI + RAG   | `lib/chat/workspaceChatCompletion.ts`             |
| Dashboard parity  | `app/api/chat/test/route.ts` (refactor to shared) |
| Theming           | `app/globals.css`, `next-themes`, widget `INIT`   |
| Dev UX            | `next.config.ts` (`devIndicators`)               |
| Chunking          | `lib/ai/chunkText.ts`, `knowledge_chunks`         |
| Embeddings        | `lib/ai/embedChunks.ts`, Hugging Face bge-small   |
| Usage / billing   | `usage_events`, `plans`, billing helper modules   |
| Retrieval prep    | `lib/knowledge/retrieveRelevantChunks.ts`         |

---

## Optional closing line for interviews

*“I owned the full path from embed loader → JWT session → iframe UI → authenticated-by-JWT chat API, and I refactored duplicated Groq/RAG code so dashboard and widget stay in sync.”*
