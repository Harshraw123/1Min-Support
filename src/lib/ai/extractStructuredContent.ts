/**
 * extractStructuredContent.ts
 * Layer 2: Clean + Structured Extraction
 *
 * Sits between raw HTML (Layer 1) and LLM summarization (Layer 3).
 * Pulls three things from raw HTML:
 *   1. __NEXT_DATA__ / __APOLLO_STATE__ — React/Next.js page state
 *   2. JSON-LD blocks — schema.org structured data (products, FAQs, etc.)
 *   3. Clean readable text — DOM stripped of all noise
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface ExtractedContent {
    cleanText: string;           // human-readable, noise-free
    jsonLd: Record<string, unknown>[];    // all JSON-LD blocks found
    nextData: Record<string, unknown> | null; // __NEXT_DATA__ if present
    apolloState: Record<string, unknown> | null; // __APOLLO_STATE__ if present
    /** Flattened best-effort string ready to send to LLM */
    structured: string;
  }
  
  // ─────────────────────────────────────────────────────────────
  // 1. Extract __NEXT_DATA__
  // ─────────────────────────────────────────────────────────────
  
  function extractNextData(html: string): Record<string, unknown> | null {
    // Next.js page state mil jaye to JSON parse karke return karta hai.
    try {
      const match = html.match(
        /<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i
      );
      if (!match?.[1]) return null;
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 2. Extract __APOLLO_STATE__
  // ─────────────────────────────────────────────────────────────
  
  function extractApolloState(html: string): Record<string, unknown> | null {
    // Apollo/GraphQL cache script se structured data nikalne ki koshish karta hai.
    try {
      const match = html.match(/window\.__APOLLO_STATE__\s*=\s*(\{[\s\S]*?\});<\/script>/);
      if (!match?.[1]) return null;
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
  
  // ─────────────────────────────────────────────────────────────
  // 3. Extract all JSON-LD blocks
  // ─────────────────────────────────────────────────────────────
  
  function extractJsonLd(html: string): Record<string, unknown>[] {
    // Schema.org JSON-LD blocks ko collect karke array shape me normalize karta hai.
    const results: Record<string, unknown>[] = [];
    const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  
    let match: RegExpExecArray | null;
    while ((match = regex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        // schema.org can return arrays or single objects
        if (Array.isArray(parsed)) {
          results.push(...parsed);
        } else {
          results.push(parsed);
        }
      } catch {
        // malformed JSON-LD — skip silently
      }
    }
    return results;
  }
  
  // ─────────────────────────────────────────────────────────────
  // 4. Clean readable text from HTML
  // ─────────────────────────────────────────────────────────────
  
  function extractCleanText(html: string): string {
    // HTML noise hata kar readable page text fallback banata hai.
    let text = html;
  
    // Remove entire noise blocks
    text = text.replace(/<script[\s\S]*?<\/script>/gi, "");
    text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
    text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, "");
    text = text.replace(/<svg[\s\S]*?<\/svg>/gi, "");
    text = text.replace(/<nav[\s\S]*?<\/nav>/gi, "");
    text = text.replace(/<header[\s\S]*?<\/header>/gi, "");
    text = text.replace(/<footer[\s\S]*?<\/footer>/gi, "");
    text = text.replace(/<aside[\s\S]*?<\/aside>/gi, "");
    text = text.replace(/<!--[\s\S]*?-->/g, "");
  
    // Strip remaining tags, decode entities
    text = text.replace(/<[^>]+>/g, " ");
    text = text.replace(/&nbsp;/g, " ");
    text = text.replace(/&amp;/g, "&");
    text = text.replace(/&lt;/g, "<");
    text = text.replace(/&gt;/g, ">");
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
  
    // Collapse whitespace
    text = text.replace(/\s{2,}/g, "\n").trim();
  
    return text;
  }
  
  // ─────────────────────────────────────────────────────────────
  // 5. Flatten JSON-LD into readable text for LLM
  // ─────────────────────────────────────────────────────────────
  
  function flattenJsonLd(blocks: Record<string, unknown>[]): string {
    // Common schema types ko LLM-friendly plain text lines me flatten karta hai.
    const lines: string[] = [];
  
    for (const block of blocks) {
      const type =
        typeof block === "object" && block !== null && "@type" in block
          ? (block as { "@type"?: unknown })["@type"]
          : undefined;
      if (!type) continue;
  
      lines.push(`\n[Schema: ${String(type)}]`);
  
      // Product
      if (type === "Product") {
        const b = block as Record<string, unknown>;
        if (typeof b.name === "string") lines.push(`Name: ${b.name}`);
        if (typeof b.description === "string") lines.push(`Description: ${b.description}`);
        if (b.offers) {
          const offer = Array.isArray(b.offers) ? b.offers[0] : b.offers;
          if (offer && typeof offer === "object") {
            const o = offer as Record<string, unknown>;
            if (o.price != null) {
              lines.push(`Price: ${String(o.price)} ${typeof o.priceCurrency === "string" ? o.priceCurrency : ""}`.trim());
            }
            if (typeof o.availability === "string") lines.push(`Availability: ${o.availability}`);
          }
        }
        if (b.aggregateRating && typeof b.aggregateRating === "object") {
          const r = b.aggregateRating as Record<string, unknown>;
          const ratingValue = r.ratingValue != null ? String(r.ratingValue) : "";
          const bestRating = r.bestRating != null ? String(r.bestRating) : "";
          const reviewCount = r.reviewCount != null ? String(r.reviewCount) : "";
          lines.push(`Rating: ${ratingValue}${bestRating ? ` / ${bestRating}` : ""}${reviewCount ? ` (${reviewCount} reviews)` : ""}`);
        }
      }
  
      // FAQPage
      if (type === "FAQPage" && Array.isArray((block as Record<string, unknown>).mainEntity)) {
        lines.push("FAQs:");
        const entities = (block as Record<string, unknown>).mainEntity as unknown[];
        for (const faq of entities) {
          if (!faq || typeof faq !== "object") continue;
          const f = faq as Record<string, unknown>;
          const q = typeof f.name === "string" ? f.name : "";
          const accepted = f.acceptedAnswer;
          const a =
            accepted && typeof accepted === "object" && "text" in accepted
              ? (accepted as { text?: unknown }).text
              : "";
          lines.push(`  Q: ${q}`);
          lines.push(`  A: ${typeof a === "string" ? a : ""}`);
        }
      }
  
      // BreadcrumbList
      if (type === "BreadcrumbList" && Array.isArray(block.itemListElement)) {
        const crumbs = block.itemListElement
          .map((b: unknown) =>
            typeof b === "object" && b !== null && "name" in b
              ? (b as { name?: unknown }).name
              : undefined
          )
          .filter((v): v is string => typeof v === "string" && v.length > 0);
        lines.push(`Breadcrumbs: ${crumbs.join(" > ")}`);
      }
  
      // Organization / WebSite
      if (type === "Organization" || type === "WebSite") {
        const b = block as Record<string, unknown>;
        if (typeof b.name === "string") lines.push(`Org Name: ${b.name}`);
        if (typeof b.description === "string") lines.push(`Org Description: ${b.description}`);
        if (typeof b.url === "string") lines.push(`URL: ${b.url}`);
      }
  
      // Article / BlogPosting
      if (type === "Article" || type === "BlogPosting") {
        const b = block as Record<string, unknown>;
        if (typeof b.headline === "string") lines.push(`Headline: ${b.headline}`);
        if (typeof b.description === "string") lines.push(`Description: ${b.description}`);
        if (typeof b.datePublished === "string") lines.push(`Published: ${b.datePublished}`);
        const author = b.author;
        if (author && typeof author === "object" && "name" in author) {
          const name = (author as { name?: unknown }).name;
          if (typeof name === "string") lines.push(`Author: ${name}`);
        }
      }
    }
  
    return lines.join("\n");
  }
  
  // ─────────────────────────────────────────────────────────────
  // 6. Flatten __NEXT_DATA__ — recursively pull string leaf values
  // ─────────────────────────────────────────────────────────────
  
  function flattenNextData(obj: unknown, depth = 0): string {
    // Nested app state se useful leaf values limited depth tak pull karta hai.
    if (depth > 5) return ""; // prevent infinite recursion
    if (!obj || typeof obj !== "object") return "";
  
    const lines: string[] = [];
  
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      // Skip noisy internal keys
      if (["__typename", "id", "cursor", "edges", "node"].includes(key)) continue;
  
      if (typeof value === "string" && value.length > 20) {
        lines.push(`${key}: ${value}`);
      } else if (typeof value === "number" || typeof value === "boolean") {
        lines.push(`${key}: ${value}`);
      } else if (typeof value === "object") {
        lines.push(flattenNextData(value, depth + 1));
      }
    }
  
    return lines.filter(Boolean).join("\n");
  }
  
  // ─────────────────────────────────────────────────────────────
  // MAIN EXPORT: extractStructuredContent
  // ─────────────────────────────────────────────────────────────
  
  export function extractStructuredContent(html: string): ExtractedContent {
    // Raw HTML ko structured context aur clean text dono formats me prepare karta hai.
    const jsonLd     = extractJsonLd(html);
    const nextData   = extractNextData(html);
    const apolloState = extractApolloState(html);
    const cleanText  = extractCleanText(html);
  
    // Build the structured string LLM will receive
    const parts: string[] = [];
  
    // Priority 1: JSON-LD (most reliable schema data)
    if (jsonLd.length > 0) {
      parts.push("=== STRUCTURED DATA (JSON-LD) ===");
      parts.push(flattenJsonLd(jsonLd));
    }
  
    // Priority 2: Next.js page state
    const pageProps =
      typeof nextData?.props === "object" && nextData.props !== null && "pageProps" in nextData.props
        ? (nextData.props as { pageProps?: unknown }).pageProps
        : undefined;
    if (pageProps && typeof pageProps === "object") {
      parts.push("\n=== PAGE DATA (__NEXT_DATA__) ===");
      parts.push(flattenNextData(pageProps));
    }
  
    // Priority 3: Apollo state (GraphQL cache)
    if (apolloState) {
      parts.push("\n=== APOLLO/GRAPHQL STATE ===");
      parts.push(flattenNextData(apolloState));
    }
  
    // Priority 4: Clean text (always include as fallback)
    parts.push("\n=== PAGE TEXT (CLEAN) ===");
    // Limit clean text to avoid token overflow — 8000 chars is enough signal
    parts.push(cleanText.slice(0, 8000));
  
    return {
      cleanText,
      jsonLd,
      nextData,
      apolloState,
      structured: parts.join("\n"),
    };
  }
