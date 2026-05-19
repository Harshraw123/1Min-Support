# 1min Support

An AI customer support SaaS with a dashboard-managed knowledge base, section-based chatbot behavior, and an embeddable website widget. The system supports knowledge ingestion from uploads, websites, and text, then prepares the content for scalable RAG using PostgreSQL + pgvector.

## What It Does

- Create and configure AI support chatbots for a workspace.
- Add knowledge sources from file uploads, website scraping, or pasted text.
- Organize chatbot behavior with sections, tone, allowed topics, blocked topics, and source selection.
- Embed a public support widget on external websites.
- Use separate auth boundaries for dashboard users and public widget visitors.
- Track AI, ingestion, embedding, and chunk usage for future usage-based billing.
- Prepare a scalable retrieval path with chunking, embeddings, pgvector, and keyword search.

## Tech Stack

| Area | Stack |
|---|---|
| App | Next.js App Router |
| Database | PostgreSQL / Neon |
| ORM | Drizzle ORM |
| Vector search | pgvector inside PostgreSQL |
| Keyword search prep | `pg_trgm` |
| LLM | Groq SDK, `llama-3.3-70b-versatile` |
| Embeddings | Hugging Face, `BAAI/bge-small-en-v1.5` |
| Embedding dimensions | `vector(384)` |
| Auth / workspace identity | `session.organization_id` |
| Public widget auth | Signed JWT |
| Billing foundation | Append-only usage events + plan/subscription schema |

## Architecture

```txt
Dashboard User
  -> authenticated session
  -> workspace_id from session.organization_id
  -> creates chatbot / sections
  -> adds knowledge sources

Knowledge Ingestion
  -> raw upload / website / text
  -> summarizeMarkdown() for compact UI content
  -> cleanContent() for full retrieval content
  -> chunkText()
  -> embedChunks() with Hugging Face
  -> store summary in knowledge
  -> store chunks + vector(384) embeddings in knowledge_chunks
  -> record usage_events

Customer Website
  -> loads public widget script
  -> creates widget JWT session
  -> iframe loads embed UI
  -> visitor sends message
  -> /api/widget/chat verifies JWT
  -> shared workspaceChatCompletion()
  -> Groq response
  -> usage event recorded
```

## RAG Design

The current chat path keeps existing behavior stable by loading selected knowledge content into the prompt. In parallel, ingestion now prepares the scalable retrieval layer.

### Ingestion Pipeline

```txt
Raw content
  -> summarizeMarkdown(rawContent)
  -> stored in knowledge.content

Raw content
  -> cleanContent(rawContent)
  -> chunkText(cleanMarkdown, chunkSize = 400, overlap = 50)
  -> embedChunks(chunks)
  -> stored in knowledge_chunks
```

### Why Summary and Clean Content Are Separate

`knowledge.content` stays compact for the dashboard UI. Retrieval needs more detail, so cleaned full content is used for chunks and embeddings. This avoids weakening RAG by embedding only short summaries.

### Vector Storage

This project does not use Pinecone, Weaviate, or Qdrant. It uses pgvector inside PostgreSQL:

```txt
knowledge_chunks
  - id
  - knowledge_id
  - workspace_id
  - chunk_index
  - content
  - embedding vector(384)
  - token_count
```

`BAAI/bge-small-en-v1.5` returns 384-dimensional embeddings, so the database uses `vector(384)`, not `vector(1536)`.

**Why pgvector:** embeddings stay in the same transactional database as workspaces, sections, billing, and knowledge. This keeps infrastructure simple and avoids syncing data between Postgres and a separate vector database.

## Multi-Tenant Workspace Model

Workspace identity comes from:

```txt
session.organization_id
```

This is used consistently for dashboard data, knowledge ingestion, sections, and chat context. Every billable AI call can include `section_id` when available, which enables future analytics like:

- Workspace usage.
- Section-wise usage.
- Widget vs dashboard test usage.
- Ingestion vs chat cost.
- Expensive knowledge sources or sections.

## Public Widget Flow

The public widget is intentionally separate from dashboard auth:

```txt
Dashboard chat
  -> session auth
  -> /api/chat/test
  -> billable: false by default

Embedded widget chat
  -> widget JWT
  -> /api/widget/chat
  -> billable: true
```

Both routes use the shared `workspaceChatCompletion()` path so dashboard testing and production widget behavior stay aligned.

## Usage-Based Billing Foundation

The app includes billing-ready tables:

- `plans`
- `workspace_subscriptions`
- `usage_events`
- `usage_daily_rollups`

`usage_events` is append-only and acts as the audit log. Daily rollups are intended for fast dashboard and billing views.

Tracked events include:

- `knowledge_ingest`
- `content_clean`
- `content_summarize`
- `embedding_generate`
- `chunk_store`
- `chat_completion`
- `widget_message`
- `dashboard_test_message`
- `retrieval_query`

Billing is intentionally non-blocking by default. `checkUsageLimit()` exists so enforcement can be enabled later without changing core flows.

## Reliability Decisions

- Embedding failures do not break ingestion.
- Failed embeddings are logged with `[EMBEDDING_ERROR]`.
- Usage recording does not crash the main user flow by default.
- Existing API response shapes are preserved.
- Old chat behavior remains until chunk retrieval is fully tested.
- External vector databases are avoided for MVP simplicity.

## Environment Variables

Create `.env`:

```env
DATABASE_URL=

GROQ_API_KEY=
HF_TOKEN=
SCRAPE_DO_TOKEN=

JWT_SECRET=
```

Optional future billing variables depend on the provider selected, for example Lemon Squeezy or Stripe.

## Database Setup

Enable required Postgres extensions and push schema:

```bash
npm run db:push
```

This runs:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

Then applies the Drizzle schema.

## Run Locally

```bash
npm install
npm run db:push
npm run dev
```

Open:

```txt
http://localhost:3000
```

## Useful Commands

```bash
npm run dev
npm run build
npm run lint
npm run db:bootstrap
npm run db:push
```

## Interview Highlights

- Built a multi-tenant AI support SaaS with dashboard and public widget flows.
- Separated dashboard session auth from public widget JWT auth.
- Refactored chat into a shared AI completion path for dashboard and widget parity.
- Designed ingestion for scalable RAG without changing existing API response shapes.
- Used pgvector inside Postgres instead of adding an external vector database.
- Split compact summaries from cleaned retrieval content.
- Added usage event tracking as the foundation for usage-based billing.
- Kept billing enforcement non-blocking until plan policy is ready.
- Added section-level usage hooks for future cost analytics.

## Strong Interview Line

> I built a workspace-based AI customer support SaaS where dashboard users manage knowledge and sections, while public visitors chat through an embedded JWT-secured widget. For RAG, I used PostgreSQL with pgvector instead of an external vector database, so embeddings stay next to workspace and knowledge data. I also added usage-event tracking so the product is ready for usage-based billing without breaking existing user flows.
