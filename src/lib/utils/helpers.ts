export function validateUrl(url: string): boolean {
    // Sirf http/https URLs ko valid external source maana jata hai.
    try {
      const parsed = new URL(url.trim());
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }
  
  export function normalizeUrl(url: string): string {
    // URL compare/save se pehle whitespace aur trailing slash clean hota hai.
    return url.trim().replace(/\/$/, "");
  }
