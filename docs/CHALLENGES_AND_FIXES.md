# Challenges & Bugs Fixed — Interview Notes

This document summarizes real problems encountered while building the **embeddable chat widget** (`/embed`, `public/widget.js`) and related flows, and how they were resolved. Use these as concrete stories in interviews.

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

---

## Optional closing line for interviews

*“I owned the full path from embed loader → JWT session → iframe UI → authenticated-by-JWT chat API, and I refactored duplicated Groq/RAG code so dashboard and widget stay in sync.”*
