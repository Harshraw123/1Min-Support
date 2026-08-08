/** Stable plan identifiers used across billing code. */
export const PLAN_SLUGS = {
  FREE: "free",
  PRO: "pro",
} as const;

export type PlanSlug = (typeof PLAN_SLUGS)[keyof typeof PLAN_SLUGS];

export const PLAN_IDS = {
  FREE: "plan_free",
  PRO: "plan_pro",
} as const;

/** Default monthly AI message caps (also seeded into plans table). */
export const DEFAULT_AI_MESSAGE_LIMITS = {
  free: 100,
  pro: 5000,
} as const;

/** UTC year-month key for monthly counters, e.g. 2026-08 */
export function currentYearMonth(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function isPaidSubscriptionStatus(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}
