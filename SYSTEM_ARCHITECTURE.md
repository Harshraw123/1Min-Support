# System Architecture — 1-Min Customer Support

Readable reference for the **current** product architecture after knowledge, RAG, embed widget, and **human handover** were implemented.

---

## 1. Product overview

1-Min Support is a multi-tenant AI customer-support SaaS:

1. Dashboard users manage **knowledge**, **sections**, and **chatbot appearance** for their workspace.
2. Customers chat through an **embeddable widget** on the customer’s website.
3. AI answers from workspace knowledge (RAG). When it cannot resolve an issue, it **escalates** into a persistent support queue.
4. Organization members take ownership, reply as humans, and resolve conversations.
5. Once a human owns a conversation, **AI must not auto-reply**.

Core principle:

> Escalation means “needs human attention,” not “a human is online right now.” Unassigned escalations stay in the queue until an agent takes them.

---

## 2. High-level system map

```text
Customer website
  → public/widget.js (SDK)
  → /api/widget/session (JWT)
  → /embed + ChatContainer
  → /api/widget/chat | /api/widget/conversation
  → conversation + messages (Neon/Postgres)
  → workspaceChatCompletion (Groq + RAG) when handling_mode = AI
  → escalate → support queue
  → Dashboard Conversations inbox
  → agent take / assign / reply / resolve
```

```mermaid
flowchart TD
  subgraph CustomerSite[Customer website]
    WJS[widget.js]
    EMB[/embed ChatContainer]
  end

  subgraph PublicAPI[Public widget APIs - JWT]
    WS[/api/widget/session]
    WC[/api/widget/chat]
    WV[/api/widget/conversation]
  end

  subgraph Core[Shared domain]
    CONV[(conversation)]
    MSG[(messages)]
    AI[workspaceChatCompletion]
    RAG[pgvector + knowledge_chunks]
    ESC[escalateConversation]
  end

  subgraph Dashboard[Dashboard - session cookie]
    INBOX[Conversations inbox]
    KNOW[Knowledge / Sections / Chatbot]
    TEAM[Team members]
    CA[/api/conversations/*]
  end

  WJS --> WS --> EMB
  EMB --> WC
  EMB --> WV
  WC --> CONV
  WC --> MSG
  WC -->|if AI mode| AI --> RAG
  AI --> ESC --> CONV
  INBOX --> CA --> CONV
  CA --> MSG
  KNOW --> RAG
  TEAM --> CA
```

---

## 3. Tenancy & identity

| Concept | Source of truth | Notes |
|---|---|---|
| Workspace / org | `session.organization_id` (Scalekit) | Used as `workspace_id` everywhere |
| Chatbot id | Same org id today | Stored as `chatbot_id`; kept separate so multi-bot can land later |
| Dashboard auth | `user_session` cookie via `getSession()` | Server routes must use session org — never trust client org ids |
| Widget auth | HS256 JWT (`JWT_SECRET`) | Payload: `widgetId`, `chatbotId`, `sessionId` (2h) |
| Team | `team_members` | Roles: `admin` / `member` (Scalekit invites) |
| Visitor continuity | `visitor_id` in localStorage | Survives refresh better than rotating JWT `sessionId` |

Tenant rule: every conversation query is scoped by `workspace_id` (dashboard) or JWT `chatbotId` (widget).

---

## 4. Database model (live)

### 4.1 Knowledge & RAG

| Table | Role |
|---|---|
| `knowledge` | Source summary for UI (`content` is compact) |
| `knowledge_chunks` | Cleaned chunks + `vector(384)` embeddings (`BAAI/bge-small-en-v1.5`) |
| `sections` | Tone, topics, `fallback_behavior`, linked `source_ids` |
| `chat_bot_metadata` | Widget appearance, `widget_id`, optional `allowed_domain` |

Ingestion path:

```text
raw upload / scrape / text
  → summarizeMarkdown → knowledge.content (UI)
  → cleanContent → chunkText → embedChunks → knowledge_chunks
```

Retrieval path (chat):

```text
query embed + pgvector distance + pg_trgm
  → RRF merge
  → buildKnowledgeContextForChat
  → fallback to knowledge.content if no chunk hits
```

### 4.2 Conversations & messages

**`conversation`** (lifecycle + ownership)

| Field | Meaning |
|---|---|
| `workspace_id` | Tenant |
| `chatbot_id` | Bot for that tenant |
| `visitor_id` | Stable browser visitor |
| `widget_session_id` | Current JWT session |
| `status` | `ai_active` \| `escalated` \| `human_handling` \| `resolved` (legacy: `active`/`closed` normalized) |
| `handling_mode` | `AI` \| `HUMAN` — who may auto-reply |
| `assigned_agent_*` | Owner agent (nullable while queued) |
| `escalation_reason` / `escalation_summary` / `escalated_at` / `escalated_by` | Agent context |
| `priority` | `LOW` \| `NORMAL` \| `HIGH` \| `URGENT` |
| `last_customer_message` | Inbox preview |
| `resolved_at` / `resolved_by` | Resolution audit |

**`messages`**

| `role` | Speaker |
|---|---|
| `user` | Customer |
| `assistant` | AI |
| `agent` | Human support agent |
| `system` | Lifecycle event (escalate / assign / resolve / reopen) |

Also: `sender_*`, `client_message_id` (idempotent retries), `metadata`.

---

## 5. Conversation lifecycle & human handover

```text
AI_ACTIVE (handling_mode=AI)
    │  AI cannot resolve / customer asks for human / configured escalate
    ▼
ESCALATED (handling_mode=HUMAN, assigned=null)
    │  sits in support queue — agent may be offline
    ▼
HUMAN_HANDLING (assigned agent)
    │  agent replies; AI stays silent
    ▼
RESOLVED
    │  customer messages again → reopen (default AI)
    ▼
AI_ACTIVE or HUMAN_HANDLING
```

### Ownership rules

1. **`handling_mode = AI`** → widget chat may call Groq.
2. **`handling_mode = HUMAN`** → customer messages are **persisted only**; no AI reply.
3. **Take conversation** uses conditional `UPDATE … WHERE assigned_agent_email IS NULL` so only one agent wins (Neon HTTP has no interactive transactions).
4. Before delivering an AI reply, the server **re-reads** the conversation. If an agent took over mid-generation, the AI text is discarded.
5. Escalation does **not** claim a human is joining now. Customer copy says the request is saved and an agent will respond when available.

### Escalation reasons

```text
AI_UNABLE_TO_RESOLVE
CUSTOMER_REQUESTED_HUMAN
ACCOUNT_SPECIFIC_ACTION
BILLING_ISSUE
REFUND_REQUEST
TECHNICAL_ISSUE
KNOWLEDGE_NOT_FOUND
CONFIGURED_ESCALATION_RULE
OTHER
```

Detection (`src/lib/conversations/escalation.ts`):

1. Model marker: `[[ESCALATE|REASON|agent summary]]` then customer-facing text  
2. Customer phrases requesting a human  
3. Soft AI “forwarded to support” phrasing / knowledge miss + section `fallback_behavior=escalate`

Shared AI entrypoint: `src/lib/chat/workspaceChatCompletion.ts` (dashboard test + widget).

---

## 6. Widget / SDK flow

```text
Script tag data-id=widgetId
  → guard duplicate init (window.__OMS_WIDGET__{id})
  → POST /api/widget/session → JWT + config
  → iframe /embed?widgetId&sessionToken
  → ChatContainer
       localStorage: visitor_id, conversation_id
       GET  /api/widget/conversation  (resume, no create)
       POST /api/widget/chat          (create/reuse + message)
       poll while HUMAN for agent replies
```

Hardening:

- No server secrets in the client SDK  
- Idempotent sends via `clientMessageId`  
- Refresh keeps the same conversation when possible  
- Domain check via `chat_bot_metadata.allowed_domain` on session create  

---

## 7. Dashboard conversations inbox

UI: `/dashboard/conversations` → `ConversationsInbox`

| Filter | Meaning |
|---|---|
| All / Active | Open work |
| Escalated | Needs human; may be unassigned |
| Unassigned | Escalated with no agent |
| Mine | Assigned to current session email |
| Human handling | Actively owned |
| Resolved | Closed |

Agent actions (all org-scoped server-side):

| Action | Endpoint |
|---|---|
| List / search | `GET /api/conversations` |
| Open thread | `GET /api/conversations/:id` |
| Take | `POST /api/conversations/:id/take` |
| Assign | `POST /api/conversations/:id/assign` |
| Reply | `POST /api/conversations/:id/reply` |
| Resolve | `POST /api/conversations/:id/resolve` |
| Reopen | `POST /api/conversations/:id/reopen` |

Domain logic lives in `src/lib/conversations/` so routes stay thin.

---

## 8. API surface (by area)

### Auth
- `GET /api/auth/login` · `callback` · `logout` · `session`

### Knowledge / sections / chatbot
- `POST/GET/DELETE /api/knowledge/*`
- `POST/PUT/GET/DELETE /api/sections/*`
- `GET/PUT /api/chatbot/metadata/*`

### Widget (public JWT + CORS)
- `POST /api/widget/session`
- `GET /api/widget/config`
- `POST /api/widget/chat`
- `GET /api/widget/conversation`

### Chat (dashboard)
- `POST /api/chat/test` — same AI path, `billable: false`, not the production conversation store

### Conversations (dashboard session)
- See section 7

### Team / org
- `GET/POST/DELETE /api/team/*`
- `GET /api/organization/fetch`
- `POST /api/webhook/secret` (Scalekit membership)

---

## 9. Knowledge → sections → chat context

```text
Section (tone, topics, fallback, source_ids)
  → linked knowledge / chunks
  → workspaceChatCompletion system prompt
  → short, context-only answers
  → escalate marker when out of knowledge / human required
```

Dashboard **Chat Simulator** uses `/api/chat/test` for preview.  
Production visitors use the **widget** path so conversations enter the inbox.

---

## 10. Security checklist

1. Dashboard APIs: `requireOrgSession()` → `organization_id` from cookie only.  
2. Conversation reads/writes: `workspace_id = session.organization_id`.  
3. Widget APIs: tenant from JWT `chatbotId` only.  
4. Assign target must resolve inside the same org (`team_members` or self).  
5. Concurrent take: atomic conditional update; loser gets `409`.  
6. AI after takeover: eligibility re-check before persist/return.
7. Billing: Lemon webhooks HMAC-verified; plan/quota never trusted from the client.

---

## 10b. Billing (simple Free + Pro via Lemon Squeezy)

Quota source of truth is **monthly billable AI messages**, not token rollups.

| Plan | Monthly AI messages |
|---|---:|
| Free | 100 |
| Pro | 5000 |

```text
Settings → Upgrade
  → POST /api/billing/checkout (server stamps workspace_id)
  → Lemon Squeezy Checkout
  → POST /api/billing/webhook (signed)
  → workspace_subscriptions = Pro/active

Widget chat
  → checkAiMessageQuota(enforce=true)
  → if over limit: save customer message, no Groq
  → if allowed: Groq reply → increment workspace_usage_monthly
```

- Dashboard `/api/chat/test` is **non-billable** (does not burn quota, does not create inbox conversations).
- Human-handover messages while `handling_mode=HUMAN` do not burn AI quota.
- Env: `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_PRO_VARIANT_ID`, `LEMON_SQUEEZY_WEBHOOK_SECRET`, `LEMON_SQUEEZY_CHECKOUT_REDIRECT_URL`.

Key files: `src/lib/billing/*`, `src/app/api/billing/*`, Settings `BillingSection`.

---

## 11. Key source files

| Path | Responsibility |
|---|---|
| `src/db/schema.ts` | Tables including conversation/messages/billing |
| `src/lib/conversations/*` | Lifecycle, escalation, auth helpers |
| `src/lib/billing/*` | Lemon checkout, webhook, AI message quota |
| `src/lib/chat/workspaceChatCompletion.ts` | Shared Groq + RAG |
| `src/lib/knowledge/*` | Context build + retrieval |
| `src/app/api/widget/chat/route.ts` | Public chat + escalate + AI stop + quota |
| `src/app/api/conversations/**` | Inbox APIs |
| `src/app/api/billing/**` | Checkout, status, Lemon webhook |
| `src/components/dashboard/ConversationsInbox.tsx` | Support inbox UI |
| `src/components/dashboard/BillingSection.tsx` | Plan + usage card |
| `src/components/chat/ChatContainer.tsx` | Embed chat + persistence |
| `public/widget.js` | Embed loader / init guard |

---

## 12. End-to-end happy path

```text
1. Customer opens site → widget.js initializes once → JWT session
2. Visitor id stored → conversation created/reused on first message
3. Customer message persisted (role=user)
4. If handling_mode=AI and under quota → RAG + Groq reply (role=assistant)
5. If escalate → status=escalated, handling_mode=HUMAN, reason+summary saved
6. Further customer messages persist; AI stays silent
7. Agent opens Conversations → Take (or Assign)
8. status=human_handling → agent replies (role=agent)
9. Widget polls and shows agent messages
10. Agent Resolve → status=resolved (no AI follow-up)
```

---

## 13. What is intentionally unfinished

- Token/ingestion hard quotas and overage pricing
- Streaming token responses
- Real-time push (inbox/widget use short polling)
- Separate multi-chatbot rows per workspace (`chatbots` table unused)
- `/api/chat/public` still stubbed (`501`)
- Customer billing portal deep-link (upgrade via checkout is live)

---

## 14. Summary

| Layer | Job |
|---|---|
| Knowledge + sections | What the AI is allowed to say |
| Widget + JWT | Public customer channel |
| Conversation + handling_mode | Single source of truth for AI vs human |
| Escalation queue | Persist work when humans are offline |
| Inbox + team | Humans take ownership without conflicting with AI |
| Billing (Lemon) | Fair Free/Pro AI message limits, abuse protection |

AI handles what it can. When it cannot, the conversation is saved with useful agent context, queued, and continued by one human owner — without AI talking over them. Monthly AI caps keep costs predictable for the organization.
