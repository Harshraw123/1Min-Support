import { NextRequest, NextResponse } from "next/server";
import { verifyLemonWebhookSignature } from "@/lib/billing/lemon";
import { claimWebhookEvent, upsertLemonSubscription } from "@/lib/billing/subscriptions";
import type { LemonSubscriptionAttrs } from "@/lib/billing/lemon";

type LemonWebhookBody = {
  meta?: {
    event_name?: string;
    event_id?: string | number;
    custom_data?: { workspace_id?: string };
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: LemonSubscriptionAttrs & {
      customer_id?: number | string;
      status?: string;
    };
  };
};

/**
 * Lemon Squeezy webhooks — signature verified, idempotent, maps custom workspace_id → entitlement.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return NextResponse.json({ message: "Webhook secret not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("X-Signature") || req.headers.get("x-signature");

  if (!verifyLemonWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
  }

  let body: LemonWebhookBody;
  try {
    body = JSON.parse(rawBody) as LemonWebhookBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const eventName = body.meta?.event_name || "unknown";
  const eventId = String(
    body.meta?.event_id ??
      `${eventName}:${body.data?.id ?? ""}:${body.data?.attributes?.updated_at ?? Date.now()}`
  );

  const claimed = await claimWebhookEvent({
    eventId,
    eventName,
    payload: body,
  });

  if (!claimed) {
    return NextResponse.json({ ok: true, deduped: true });
  }

  const subscriptionEvents = new Set([
    "subscription_created",
    "subscription_updated",
    "subscription_cancelled",
    "subscription_expired",
    "subscription_resumed",
    "subscription_paused",
    "subscription_unpaused",
    "subscription_payment_success",
    "subscription_payment_failed",
    "subscription_payment_recovered",
  ]);

  try {
    if (subscriptionEvents.has(eventName) && body.data?.type === "subscriptions") {
      const workspaceId =
        typeof body.meta?.custom_data?.workspace_id === "string"
          ? body.meta.custom_data.workspace_id.trim()
          : "";

      if (!workspaceId) {
        console.error("[LEMON_WEBHOOK] Missing custom_data.workspace_id", eventName, body.data?.id);
        // Ack to avoid endless retries for misconfigured checkouts without custom data.
        return NextResponse.json({ ok: true, skipped: "missing_workspace_id" });
      }

      const attrs = body.data.attributes || {};
      await upsertLemonSubscription({
        workspaceId,
        subscriptionId: String(body.data.id),
        customerId: attrs.customer_id != null ? String(attrs.customer_id) : null,
        attrs,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[LEMON_WEBHOOK_ERROR]", error);
    return NextResponse.json({ message: "Webhook processing failed" }, { status: 500 });
  }
}
