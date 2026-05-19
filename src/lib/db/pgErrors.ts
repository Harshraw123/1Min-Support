export function isMissingRelationError(error: unknown): boolean {
  const candidates: unknown[] = [error];
  if (typeof error === "object" && error !== null && "cause" in error) {
    candidates.push((error as { cause?: unknown }).cause);
  }

  for (const candidate of candidates) {
    if (typeof candidate === "object" && candidate !== null && "code" in candidate) {
      if ((candidate as { code?: string }).code === "42P01") return true;
    }
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.includes("does not exist") && message.includes("relation");
}
