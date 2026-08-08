import { db } from "@/db/client";
import { plans, workspace_subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isMissingRelationError } from "@/lib/db/pgErrors";
import {
  DEFAULT_AI_MESSAGE_LIMITS,
  PLAN_IDS,
  PLAN_SLUGS,
  isPaidSubscriptionStatus,
} from "./constants";

export type WorkspaceBilling = {
  workspaceId: string;
  planId: string;
  planSlug: "free" | "pro";
  planName: string;
  status: string;
  billingProvider: string;
  aiMessageLimit: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  providerSubscriptionId: string | null;
};

/**
 * Ensure Free/Pro plan rows exist (idempotent). Safe to call from API hot paths once.
 */
export async function ensureBillingPlansSeeded(): Promise<void> {
  try {
    await db
      .insert(plans)
      .values([
        {
          id: PLAN_IDS.FREE,
          slug: PLAN_SLUGS.FREE,
          name: "Free",
          monthly_price_cents: 0,
          included_ai_messages: DEFAULT_AI_MESSAGE_LIMITS.free,
          is_active: true,
        },
        {
          id: PLAN_IDS.PRO,
          slug: PLAN_SLUGS.PRO,
          name: "Pro",
          monthly_price_cents: 2900,
          included_ai_messages: DEFAULT_AI_MESSAGE_LIMITS.pro,
          is_active: true,
        },
      ])
      .onConflictDoNothing({ target: plans.id });
  } catch (error) {
    if (!isMissingRelationError(error)) {
      console.error("[BILLING_SEED_PLANS_ERROR]", error);
    }
  }
}

/**
 * Resolve the workspace entitlement. Missing subscription → Free defaults.
 * Paid limits apply only while status is active/trialing.
 */
export async function getWorkspaceBilling(workspaceId: string): Promise<WorkspaceBilling> {
  await ensureBillingPlansSeeded();

  const freeFallback: WorkspaceBilling = {
    workspaceId,
    planId: PLAN_IDS.FREE,
    planSlug: "free",
    planName: "Free",
    status: "free",
    billingProvider: "none",
    aiMessageLimit: DEFAULT_AI_MESSAGE_LIMITS.free,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    providerSubscriptionId: null,
  };

  try {
    const [subscription] = await db
      .select()
      .from(workspace_subscriptions)
      .where(eq(workspace_subscriptions.workspace_id, workspaceId))
      .limit(1);

    if (!subscription) {
      return freeFallback;
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, subscription.plan_id))
      .limit(1);

    const paid = isPaidSubscriptionStatus(subscription.status);
    const planIsPro = plan?.slug === PLAN_SLUGS.PRO || plan?.id === PLAN_IDS.PRO;
    // Canceled / past_due / expired → Free limits (org still sees status honestly).
    const effectiveSlug = paid && planIsPro ? ("pro" as const) : ("free" as const);
    const limit =
      effectiveSlug === "pro"
        ? plan?.included_ai_messages ?? DEFAULT_AI_MESSAGE_LIMITS.pro
        : DEFAULT_AI_MESSAGE_LIMITS.free;

    return {
      workspaceId,
      planId: effectiveSlug === "pro" ? PLAN_IDS.PRO : PLAN_IDS.FREE,
      planSlug: effectiveSlug,
      planName: effectiveSlug === "pro" ? plan?.name || "Pro" : "Free",
      status: subscription.status,
      billingProvider: subscription.billing_provider,
      aiMessageLimit: limit,
      currentPeriodStart: subscription.current_period_start ?? null,
      currentPeriodEnd: subscription.current_period_end ?? null,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      providerSubscriptionId: subscription.provider_subscription_id ?? null,
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return freeFallback;
    }
    throw error;
  }
}

/** Backward-compatible wrapper used by older imports. */
export async function getWorkspacePlan(workspaceId: string) {
  const billing = await getWorkspaceBilling(workspaceId);
  return {
    subscription: {
      workspace_id: billing.workspaceId,
      plan_id: billing.planId,
      status: billing.status,
      billing_provider: billing.billingProvider,
      current_period_start: billing.currentPeriodStart,
      current_period_end: billing.currentPeriodEnd,
      cancel_at_period_end: billing.cancelAtPeriodEnd,
      provider_subscription_id: billing.providerSubscriptionId,
    },
    plan: {
      id: billing.planId,
      slug: billing.planSlug,
      name: billing.planName,
      included_ai_messages: billing.aiMessageLimit,
    },
  };
}
