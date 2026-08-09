import { NextResponse } from "next/server";
import { requireOrgSession } from "@/lib/conversations/auth";
import { getDashboardOverview } from "@/lib/dashboard/getDashboardOverview";

/**
 * Live dashboard home metrics for the authenticated workspace.
 * Poll-friendly: cheap SQL aggregates, no client-side list slicing.
 */
export async function GET() {
  const auth = await requireOrgSession();
  if (!auth.ok) {
    return NextResponse.json({ message: auth.message }, { status: auth.status });
  }

  try {
    const data = await getDashboardOverview(auth.ctx.organizationId);
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[DASHBOARD_OVERVIEW_ERROR]", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
