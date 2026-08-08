import crypto from "crypto";

const LEMON_API = "https://api.lemonsqueezy.com/v1";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function isLemonConfigured(): boolean {
  return Boolean(
    process.env.LEMON_SQUEEZY_API_KEY?.trim() &&
      process.env.LEMON_SQUEEZY_STORE_ID?.trim() &&
      process.env.LEMON_SQUEEZY_PRO_VARIANT_ID?.trim()
  );
}

/**
 * Verify Lemon Squeezy webhook HMAC (X-Signature hex digest of raw body).
 */
export function verifyLemonWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret || !signatureHeader) return false;

  const digest = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(digest, "hex");
  const b = Buffer.from(signatureHeader, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Create a Lemon Squeezy checkout for Pro, tagged with workspace_id for webhook mapping.
 */
export async function createLemonCheckout(args: {
  workspaceId: string;
  email?: string | null;
  name?: string | null;
}): Promise<{ url: string; checkoutId: string }> {
  const apiKey = requireEnv("LEMON_SQUEEZY_API_KEY");
  const storeId = requireEnv("LEMON_SQUEEZY_STORE_ID");
  const variantId = requireEnv("LEMON_SQUEEZY_PRO_VARIANT_ID");
  const redirectUrl =
    process.env.LEMON_SQUEEZY_CHECKOUT_REDIRECT_URL?.trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"}/dashboard/settings?billing=success`;

  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_data: {
          email: args.email || undefined,
          name: args.name || undefined,
          custom: {
            workspace_id: args.workspaceId,
          },
        },
        product_options: {
          redirect_url: redirectUrl,
        },
      },
      relationships: {
        store: {
          data: { type: "stores", id: String(storeId) },
        },
        variant: {
          data: { type: "variants", id: String(variantId) },
        },
      },
    },
  };

  const res = await fetch(`${LEMON_API}/checkouts`, {
    method: "POST",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = (await res.json().catch(() => ({}))) as {
    data?: { id?: string; attributes?: { url?: string } };
    errors?: Array<{ detail?: string }>;
  };

  if (!res.ok) {
    const detail = json.errors?.[0]?.detail || `Lemon checkout failed (${res.status})`;
    throw new Error(detail);
  }

  const url = json.data?.attributes?.url;
  const checkoutId = json.data?.id;
  if (!url || !checkoutId) {
    throw new Error("Lemon checkout response missing url");
  }

  return { url, checkoutId };
}

export type LemonSubscriptionAttrs = {
  status?: string;
  customer_id?: number | string;
  renews_at?: string | null;
  ends_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  cancelled?: boolean;
};

export function mapLemonStatusToLocal(status: string | undefined): "active" | "past_due" | "canceled" | "free" {
  switch ((status || "").toLowerCase()) {
    case "active":
    case "on_trial":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "cancelled":
    case "canceled":
    case "expired":
    case "paused":
      return "canceled";
    default:
      return "free";
  }
}
