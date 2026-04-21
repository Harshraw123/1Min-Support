export function validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }
  
  export function normalizeUrl(url: string): string {
    return url.trim().replace(/\/$/, "");
  }