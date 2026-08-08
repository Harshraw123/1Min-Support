import { NextRequest, NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/conversations/auth";
import { checkAiMessageQuota } from "@/lib/billing/checkUsageLimit";
import { getWorkspaceBilling } from "@/lib/billing/getWorkspacePlan";
import { isLemonConfigured } from "@/lib/billing/lemon";

/** Org-facing billing status: plan, usage bar numbers, upgrade availability. */
export async function GET(_req: NextRequest) {
  const auth = await requireOrgSession();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const billing = await getWorkspaceBilling(auth.ctx.organizationId);
    const quota = await checkAiMessageQuota({
      workspace_id: auth.ctx.organizationId,
      enforce: false,
    });

    return NextResponse.json({
      plan: {
        slug: billing.planSlug,
        name: billing.planName,
        status: billing.status,
        cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
        currentPeriodEnd: billing.currentPeriodEnd,
      },
      usage: {
        aiMessagesUsed: quota.used,
        aiMessagesLimit: quota.limit,
        remaining: quota.remaining,
        yearMonth: quota.yearMonth,
      },
      checkoutAvailable: isLemonConfigured() && billing.planSlug !== "pro",
      lemonConfigured: isLemonConfigured(),
    });
  } catch (error) {
    console.error("[BILLING_STATUS_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
