import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/conversations/auth";
import { createLemonCheckout, isLemonConfigured } from "@/lib/billing/lemon";

/**
 * Create a Lemon Squeezy Pro checkout for the session organization.
 * workspace_id is stamped server-side into checkout custom_data.
 */
export async function POST(_req: NextRequest) {
  const auth = await requireOrgSession();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  if (!isLemonConfigured()) {
    return NextResponse.json(
      {
        message:
          "Billing is not configured yet. Add LEMON_SQUEEZY_API_KEY, STORE_ID, and PRO_VARIANT_ID.",
      },
      { status: 503 }
    );
  }

  try {
    const checkout = await createLemonCheckout({
      workspaceId: auth.ctx.organizationId,
      email: auth.ctx.email,
      name: auth.ctx.name,
    });

    return NextResponse.json({
      url: checkout.url,
      checkoutId: checkout.checkoutId,
    });
  } catch (error) {
    console.error("[BILLING_CHECKOUT_ERROR]", error);
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Failed to create checkout",
      },
      { status: 500 }
    );
  }
}
