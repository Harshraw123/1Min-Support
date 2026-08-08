import { db } from "@/db/client";
import {
  billing_webhook_events,
  plans,
  workspace_subscriptions,
} from "@/db/schema";
import { eq } from "drizzle-orm";
import { PLAN_IDS, PLAN_SLUGS } from "./constants";
import { ensureBillingPlansSeeded } from "./getWorkspacePlan";
import { mapLemonStatusToLocal, type LemonSubscriptionAttrs } from "./lemon";

/**
 * Upsert org entitlement from Lemon subscription webhook payload.
 * workspace_id must come from verified custom_data — never from the client alone.
 */
export async function upsertLemonSubscription(args: {
  workspaceId: string;
  subscriptionId: string;
  customerId?: string | null;
  attrs: LemonSubscriptionAttrs;
}): Promise<void> {
  await ensureBillingPlansSeeded();

  const localStatus = mapLemonStatusToLocal(args.attrs.status);
  const paid = localStatus === "active";
  const planId = paid ? PLAN_IDS.PRO : PLAN_IDS.FREE;

  // Ensure plan row exists (seed may no-op).
  const [plan] = await db.select({ id: plans.id }).from(plans).where(eq(plans.id, planId)).limit(1);
  if (!plan) {
    throw new Error(`Missing plan row ${planId}`);
  }

  const periodEnd = args.attrs.renews_at
    ? new Date(args.attrs.renews_at)
    : args.attrs.ends_at
      ? new Date(args.attrs.ends_at)
      : null;
  const periodStart = args.attrs.created_at ? new Date(args.attrs.created_at) : new Date();

  const [existing] = await db
    .select()
    .from(workspace_subscriptions)
    .where(eq(workspace_subscriptions.workspace_id, args.workspaceId))
    .limit(1);

  if (existing) {
    await db
      .update(workspace_subscriptions)
      .set({
        plan_id: planId,
        status: localStatus === "free" ? "canceled" : localStatus,
        billing_provider: "lemon_squeezy",
        provider_customer_id: args.customerId ? String(args.customerId) : existing.provider_customer_id,
        provider_subscription_id: args.subscriptionId,
        current_period_start: periodStart,
        current_period_end: periodEnd,
        cancel_at_period_end: Boolean(args.attrs.cancelled) || localStatus === "canceled",
        updated_at: new Date(),
      })
      .where(eq(workspace_subscriptions.id, existing.id));
    return;
  }

  await db.insert(workspace_subscriptions).values({
    workspace_id: args.workspaceId,
    plan_id: planId,
    status: localStatus === "free" ? "canceled" : localStatus,
    billing_provider: "lemon_squeezy",
    provider_customer_id: args.customerId ? String(args.customerId) : null,
    provider_subscription_id: args.subscriptionId,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    cancel_at_period_end: Boolean(args.attrs.cancelled) || localStatus === "canceled",
  });
}

/**
 * Record webhook event id for idempotency. Returns false if already processed.
 */
export async function claimWebhookEvent(args: {
  eventId: string;
  eventName: string;
  payload: unknown;
}): Promise<boolean> {
  try {
    await db.insert(billing_webhook_events).values({
      provider: "lemon_squeezy",
      event_id: args.eventId,
      event_name: args.eventName,
      payload: args.payload as Record<string, unknown>,
    });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.toLowerCase().includes("unique") || msg.includes("duplicate")) {
      return false;
    }
    throw error;
  }
}

export { PLAN_IDS, PLAN_SLUGS };
