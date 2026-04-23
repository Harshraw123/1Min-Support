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
    jsonLd: Record<string, any>[];    // all JSON-LD blocks found
    nextData: Record<string, any> | null; // __NEXT_DATA__ if present
    apolloState: Record<string, any> | null; // __APOLLO_STATE__ if present
    /** Flattened best-effort string ready to send to LLM */
    structured: string;
  }
  
  // ─────────────────────────────────────────────────────────────
  // 1. Extract __NEXT_DATA__
  // ─────────────────────────────────────────────────────────────
  
  function extractNextData(html: string): Record<string, any> | null {
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
  
  function extractApolloState(html: string): Record<string, any> | null {
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
  
  function extractJsonLd(html: string): Record<string, any>[] {
    const results: Record<string, any>[] = [];
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
  
  function flattenJsonLd(blocks: Record<string, any>[]): string {
    const lines: string[] = [];
  
    for (const block of blocks) {
      const type = block["@type"];
      if (!type) continue;
  
      lines.push(`\n[Schema: ${type}]`);
  
      // Product
      if (type === "Product") {
        if (block.name)        lines.push(`Name: ${block.name}`);
        if (block.description) lines.push(`Description: ${block.description}`);
        if (block.offers) {
          const offer = Array.isArray(block.offers) ? block.offers[0] : block.offers;
          if (offer?.price)    lines.push(`Price: ${offer.price} ${offer.priceCurrency ?? ""}`);
          if (offer?.availability) lines.push(`Availability: ${offer.availability}`);
        }
        if (block.aggregateRating) {
          lines.push(`Rating: ${block.aggregateRating.ratingValue} / ${block.aggregateRating.bestRating} (${block.aggregateRating.reviewCount} reviews)`);
        }
      }
  
      // FAQPage
      if (type === "FAQPage" && Array.isArray(block.mainEntity)) {
        lines.push("FAQs:");
        for (const faq of block.mainEntity) {
          lines.push(`  Q: ${faq.name}`);
          lines.push(`  A: ${faq.acceptedAnswer?.text ?? ""}`);
        }
      }
  
      // BreadcrumbList
      if (type === "BreadcrumbList" && Array.isArray(block.itemListElement)) {
        const crumbs = block.itemListElement.map((b: any) => b.name).filter(Boolean);
        lines.push(`Breadcrumbs: ${crumbs.join(" > ")}`);
      }
  
      // Organization / WebSite
      if (type === "Organization" || type === "WebSite") {
        if (block.name)        lines.push(`Org Name: ${block.name}`);
        if (block.description) lines.push(`Org Description: ${block.description}`);
        if (block.url)         lines.push(`URL: ${block.url}`);
      }
  
      // Article / BlogPosting
      if (type === "Article" || type === "BlogPosting") {
        if (block.headline)    lines.push(`Headline: ${block.headline}`);
        if (block.description) lines.push(`Description: ${block.description}`);
        if (block.datePublished) lines.push(`Published: ${block.datePublished}`);
        if (block.author?.name)  lines.push(`Author: ${block.author.name}`);
      }
    }
  
    return lines.join("\n");
  }
  
  // ─────────────────────────────────────────────────────────────
  // 6. Flatten __NEXT_DATA__ — recursively pull string leaf values
  // ─────────────────────────────────────────────────────────────
  
  function flattenNextData(obj: any, depth = 0): string {
    if (depth > 5) return ""; // prevent infinite recursion
    if (!obj || typeof obj !== "object") return "";
  
    const lines: string[] = [];
  
    for (const [key, value] of Object.entries(obj)) {
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
    if (nextData?.props?.pageProps) {
      parts.push("\n=== PAGE DATA (__NEXT_DATA__) ===");
      parts.push(flattenNextData(nextData.props.pageProps));
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