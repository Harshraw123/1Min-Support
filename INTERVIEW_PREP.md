# 🚀 1-Min Support — Interview Master Script & Prep Guide

> **Quick Summary:** Ye document tumhare kal ke interview ke liye ek **step-by-step master script** hai. Isme simple **Hinglish explanations** (samajhne ke liye) aur **Ready-to-speak English lines** (interviewer ke samne bolne ke liye) dono hain. Short, crisp, high-impact!

---

## 🎯 Table of Contents
1. [30-Second Elevator Pitch](#1-30-second-elevator-pitch)
2. [What Problem Does It Solve?](#2-what-problem-does-it-solve)
3. [Why This Tech Stack? (Justification)](#3-why-this-tech-stack-justification)
4. [Step-by-Step System Walkthrough (Which Part Does What)](#4-step-by-step-system-walkthrough-which-part-does-what)
5. [Top 10 Real Bugs Encountered & How I Solved Them](#5-top-10-real-bugs-encountered--how-i-solved-them)
6. [Human Handover & Escalation Logic](#6-human-handover--escalation-logic)
7. [How I Will Scale It (Future Architecture)](#7-how-i-will-scale-it-future-architecture)

---

## 1. 30-Second Elevator Pitch

### 🗣️ English Script (Bolne ke liye):
> *"I built **1-Min Support**, a multi-tenant Agentic AI Customer Support SaaS that transforms business knowledge (docs, websites, text) into autonomous support agents. It provides an embeddable widget for third-party websites with strict dual-auth security: session cookies for dashboard builders and signed JWTs for public visitors. It features hybrid RAG using PostgreSQL + pgvector, and an intelligent human handover system so when AI cannot answer, the conversation seamlessly escalates to a live support inbox without AI interrupting human agents."*

### 💡 Hinglish Explanation (Samajhne ke liye):
Ye ek SaaS platform hai jahan business apna data (PDFs, links, text) upload karta hai. System usko chunk karke pgvector me store karta hai. Fir ek AI chatbot banta hai jise kisi bhi customer website par ek `<script>` tag se embed kar sakte hain. Jab AI confuse hota hai ya customer human agent mangta hai, to conversation instantly human agent ke dashboard inbox me escalate ho jati hai aur AI chup ho jata hai.

---

## 2. What Problem Does It Solve?

| Problem in Traditional Support | How 1-Min Support Solves It |
|---|---|
| **High Support Ticket Costs**: Humans answering repetitive FAQs (refunds, pricing, setup). | AI answers 70-80% routine questions instantly from workspace knowledge. |
| **Dumb Chatbots**: Traditional rule-based bots fail on context or hallucinate. | Vector-based RAG retrieves exact context chunks before answering; strict fallback prompts prevent hallucination. |
| **Awkward AI vs Human Conflict**: AI keeps interrupting while a human agent is typing. | Atomic `handling_mode` (AI vs HUMAN) state machine ensures AI stops immediately once handed over. |
| **Complex Infra Overhead**: Needing separate vector DBs (Pinecone, Qdrant) + separate backend sync. | Everything stays inside PostgreSQL using `pgvector` — zero sync lag, single source of truth. |

---

## 3. Why This Tech Stack? (Justification)

| Technology | What we used | Why we chose it over alternatives |
|---|---|---|
| **Framework** | Next.js 15 (App Router) + TypeScript | Fullstack capabilities (React 19 Server Components, Edge/Node API routes, fast SSR, type safety across client and server). |
| **Database & ORM** | PostgreSQL (Neon serverless) + Drizzle ORM | Relational integrity for multi-tenancy, serverless scale, and Drizzle gives zero-overhead type-safe SQL queries. |
| **Vector DB** | `pgvector` inside PostgreSQL | **No external Vector DB (Pinecone/Qdrant)!** Keeps embeddings in the exact same transactional DB with workspace isolation (`workspace_id`), zero data drift, and lower cost. |
| **LLM Engine** | Groq SDK (`llama-3.3-70b-versatile`) | Ultra-low latency (sub-500ms inference) for real-time customer support chat at fraction of proprietary OpenAI costs. |
| **Embeddings** | Hugging Face (`BAAI/bge-small-en-v1.5`) | Compact **384 dimensions** (fast similarity calculations, low memory footprint in Postgres compared to 1536d OpenAI vectors). |
| **Auth Boundaries** | Scalekit (Session Cookie) + Custom Signed JWT | Strict separation: Dashboard users authenticate via organizational session cookies; public website visitors use short-lived HS256 signed JWTs. |
| **Billing** | Lemon Squeezy | Webhook-driven recurring subscriptions with monthly AI message quotas (100 Free / 5000 Pro). |

---

## 4. Step-by-Step System Walkthrough (Which Part Does What)

```txt
[1. Ingestion] Upload / Website / Text ──► Summarize (UI) + Clean & Chunk (384d Embeddings) ──► pgvector
[2. Embed SDK] Customer Website loads widget.js ──► Issues JWT Session ──► Opens Iframe (/embed)
[3. Chat Flow] Visitor Messages ──► /api/widget/chat (JWT auth) ──► pgvector RAG ──► Groq LLM
[4. Escalation] Out of Knowledge / User requests Human ──► Escalate to Inbox ──► Human Takes Over (AI stops)
[5. Billing]   Monthly AI message quota checked on every message via Lemon Squeezy subscriptions
```

### Part A: Knowledge Ingestion Pipeline
1. User uploads a file, enters website URL, or pastes text.
2. **Two parallel AI steps happen**:
   - `summarizeMarkdown()`: Creates a short, clean summary shown in the Dashboard UI.
   - `cleanContent()`: Strips scripts, ads, and HTML noise, but preserves rich technical content.
3. `chunkText()`: Splits cleaned markdown into 400-token chunks with 50-token overlap.
4. `embedChunks()`: Hugging Face generates 384-dimensional vectors stored in `knowledge_chunks` with `workspace_id`.

### Part B: Embeddable Widget Architecture
1. Customer website includes: `<script src="https://yourapp.com/widget.js" data-id="WIDGET_ID"></script>`.
2. `widget.js` calls `/api/widget/session` with `widgetId`.
3. Backend validates domain (`allowed_domain`) and signs a short-lived **HS256 JWT** containing `{ chatbotId, widgetId, sessionId }`.
4. An isolated `<iframe>` renders `/embed`, storing `visitor_id` and `conversation_id` in localStorage so chat persists on page refresh.

### Part C: Public Chat & Shared AI Pipeline
1. Visitor sends a message -> `POST /api/widget/chat` with `Bearer <JWT>`.
2. Shared helper `workspaceChatCompletion.ts`:
   - Checks workspace AI quota.
   - Retrieves top chunks from `knowledge_chunks` via cosine similarity (`<=>` in pgvector) and `pg_trgm`.
   - Sends system prompt + context + history to Groq (`openai/gpt-oss-120b`).
3. If LLM outputs escalation marker `[[ESCALATE|REASON|summary]]`, system updates conversation `handling_mode = 'HUMAN'` and moves it to the agent queue.

### Part D: Dashboard Conversations Inbox (Human Handover)
1. Live support inbox at `/dashboard/conversations`.
2. Agent sees queues: *All, Escalated, Unassigned, Mine, Resolved*.
3. Agent clicks **"Take Conversation"** -> Atomically assigns conversation to themselves.
4. Once assigned, `handling_mode` becomes `HUMAN` -> AI auto-reply is completely blocked.
5. Agent replies directly from dashboard; visitor widget polls and renders human messages.

---

## 5. Top 10 Real Bugs Encountered & How I Solved Them

### 🐛 Bug 1: Embed Widget Showed Nothing (Blank Screen / No Launcher)
- **Symptom:** Test page and client websites showed no chat bubble.
- **Root Cause:** The test page used a hardcoded mock UUID. `POST /api/widget/session` returned `404 Not Found`, so `widget.js` aborted before creating the iframe.
- **Fix:** Switched to client-side metadata fetch (`/api/chatbot/metadata/fetch`) to inject the real database `widget_id`, and used origin-relative paths for `/widget.js`.
- **🗣️ 1-Line Pitch:** *"I diagnosed a silent loader failure caused by hardcoded test IDs and fixed it by making session initialization dynamically metadata-driven."*

---

### 🐛 Bug 2: Dashboard AI Chat Worked, But Embed Widget Failed
- **Symptom:** Testing in dashboard worked, but widget inside iframe gave mock placeholder replies.
- **Root Cause:** Dashboard used session cookies calling `/api/chat/test`, whereas embed visitors only had a widget JWT. The embed component was using a static `setTimeout` mock.
- **Fix:** Built a unified AI pipeline in `workspaceChatCompletion.ts` and created `/api/widget/chat` which verifies JWT bearer tokens while sharing the same business logic.
- **🗣️ 1-Line Pitch:** *"I unified the AI completion engine behind two distinct auth boundaries: session cookies for builders and signed JWTs for visitors."*

---

### 🐛 Bug 3: UI Summary vs RAG Retrieval Quality Conflict
- **Symptom:** If we summarized uploaded docs for a clean dashboard UI, the AI lost critical details during chat. If we stored raw HTML/markdown, the dashboard UI looked cluttered.
- **Root Cause:** Using one database column for both human reading and vector search.
- **Fix:** Split ingestion into 2 pipelines: `summarizeMarkdown()` stored in `knowledge.content` (for UI display), and `cleanContent()` chunked + embedded into `knowledge_chunks` (for RAG).
- **🗣️ 1-Line Pitch:** *"I decoupled human-facing summaries from retrieval-facing chunks to keep the dashboard clean without sacrificing RAG answer depth."*

---

### 🐛 Bug 4: Neon Postgres HTTP Concurrent Race Condition (Agent Takeover)
- **Symptom:** Two support agents clicking "Take Conversation" at the exact same moment both thought they owned the ticket.
- **Root Cause:** Neon serverless HTTP driver does not maintain long interactive transaction locks.
- **Fix:** Implemented atomic conditional SQL: `UPDATE conversation SET assigned_agent_email = $1 WHERE id = $2 AND assigned_agent_email IS NULL`. If rows affected is 0, backend returns `409 Conflict`.
- **🗣️ 1-Line Pitch:** *"I prevented agent takeover race conditions using optimistic atomic conditional SQL updates, returning a 409 Conflict to concurrent requesters."*

---

### 🐛 Bug 5: AI "Talking Over" Human Agent Mid-Generation
- **Symptom:** If a human agent took over while Groq LLM was generating a response, the AI message would still post after the human had started talking.
- **Root Cause:** LLM completion takes ~800ms. In between API start and finish, conversation state changed in DB.
- **Fix:** Added a pre-write check: Re-verify `handling_mode == 'AI'` right before persisting the assistant message. If `handling_mode` changed to `HUMAN`, discard the AI response.
- **🗣️ 1-Line Pitch:** *"I introduced an atomic pre-write state check so AI responses generated in-flight are discarded if a human agent takes over during generation."*

---

### 🐛 Bug 6: Hugging Face Rate Limit / Outage Breaking Ingestion
- **Symptom:** If Hugging Face API threw a 503/429 error, user document uploads crashed completely.
- **Root Cause:** Embedding generation was a synchronous hard blocker in the upload request.
- **Fix:** Made embeddings resilient: validated 384 dimensions, logged `[EMBEDDING_ERROR]`, recorded a failed usage event, but saved the knowledge record so user never loses their data.
- **🗣️ 1-Line Pitch:** *"I made vector generation resilient and non-blocking so third-party embedding downtimes never corrupt or abort user document uploads."*

---

### 🐛 Bug 7: Dark / Light Mode Conflict in Third-Party Embeds
- **Symptom:** Customer sites with dark themes had unreadable text inside the light-themed widget.
- **Root Cause:** Tailwind CSS v4 defaults to `prefers-color-scheme` media query instead of class-based theming used by `next-themes`.
- **Fix:** Configured `@custom-variant dark (&:where(.dark, .dark *));` in CSS and sent the host website's theme via `postMessage` (`INIT` event) to the iframe.
- **🗣️ 1-Line Pitch:** *"I synchronized iframe theme states with host websites using a postMessage handshake and Tailwind v4 custom class variants."*

---

### 🐛 Bug 8: Next.js Dev UI Overlaying Widget in Local Testing
- **Symptom:** Next.js floating dev indicator icon overlapped the chat bubble during testing.
- **Root Cause:** Next.js 15 devIndicators overlay enabled by default.
- **Fix:** Added `devIndicators: false` in `next.config.ts`.
- **🗣️ 1-Line Pitch:** *"Disabled framework dev indicators in configuration to guarantee local testing parity with production client sites."*

---

### 🐛 Bug 9: Vector Dimension Mismatch in pgvector
- **Symptom:** Postgres threw `invalid vector dimension` error on chunk insertion.
- **Root Cause:** Schema initially had standard OpenAI `vector(1536)`, but our Hugging Face model (`bge-small-en-v1.5`) generates `vector(384)`.
- **Fix:** Updated Drizzle schema to `vector("embedding", { dimensions: 384 })` and added array length runtime validation before DB insert.
- **🗣️ 1-Line Pitch:** *"Aligned database vector dimensions strictly to 384d to match BGE-small embeddings and prevent runtime SQL errors."*

---

### 🐛 Bug 10: False 403 Errors on Widget Session Handshake
- **Symptom:** Legitimate websites embedding the widget received 403 Forbidden on initial script load.
- **Root Cause:** Browser privacy settings and certain reverse proxies omit the `Origin` header on initial script triggers. The backend did strict `origin !== allowed_domain` without checking if `origin` existed.
- **Fix:** Changed domain validation to only enforce when `origin` is explicitly present, and rely on JWT secret verification for subsequent API calls.
- **🗣️ 1-Line Pitch:** *"Refined CORS origin inspection to eliminate false 403s on privacy-hardened browsers while maintaining token-based API security."*

---

## 6. Human Handover & Escalation Logic

```mermaid
stateDiagram-v2
    [*] --> AI_ACTIVE: User Opens Chat
    AI_ACTIVE --> ESCALATED: Out of knowledge / User asks human
    note right of ESCALATED: handling_mode = HUMAN<br/>Sits in Support Queue (Assigned: null)
    ESCALATED --> HUMAN_HANDLING: Agent clicks 'Take Conversation'
    note right of HUMAN_HANDLING: Agent replies via Dashboard<br/>AI auto-reply disabled
    HUMAN_HANDLING --> RESOLVED: Agent clicks 'Resolve'
    RESOLVED --> AI_ACTIVE: Customer sends new message (Reopens)
```

### Key Escalation Triggers:
1. **Model Marker**: AI LLM outputs `[[ESCALATE|REASON|summary]]` when uncertain.
2. **Keyword Intent**: Customer explicitly types *"I want a human"*, *"talk to agent"*, *"support representative"*.
3. **Fallback Configuration**: When RAG finds 0 relevant chunks and section fallback is set to `escalate`.

---

## 7. How I Will Scale It (Future Architecture)

### 🗣️ English Answer (for Interviewer):
> *"To scale 1-Min Support to millions of messages and thousands of concurrent tenants, I have planned a 4-phase roadmap:*
> 1. ***Real-Time Transport (WebSockets / SSE)***: *Replace current short polling in the support inbox and widget with Server-Sent Events or WebSockets (via Redis Pub/Sub) for instant, low-overhead messaging.*
> 2. ***Async Ingestion Queues***: *Offload large PDF scraping and chunking to background workers using Inngest or BullMQ with Redis, returning immediate upload status to the user.*
> 3. ***Advanced RAG Pipeline***: *Implement hybrid search (pgvector cosine + pg_trgm BM25) fused with Reciprocal Rank Fusion (RRF) and a Cohere cross-encoder reranker for higher answer accuracy.*
> 4. ***Edge Semantic Caching***: *Cache frequent question embeddings in Redis (Upstash) to return instant cached responses for identical FAQ queries, saving 40% LLM inference costs."*

---

## 🎓 Cheat Sheet: Golden Lines to Remember

- **On pgvector vs Pinecone**: *"pgvector keeps metadata, tenant workspaces, and vectors in a single ACID-compliant database. No syncing, no dual-writes, no network hops between DBs."*
- **On Security**: *"Dashboard uses session cookies via server actions; widget uses short-lived HS256 signed JWTs. No API keys or tenant secrets ever touch the client script."*
- **On Human Handover**: *"Escalation means 'needs human attention', not 'a human is online right now'. The conversation is safely persisted in an unassigned queue with AI context until an agent takes it."*
