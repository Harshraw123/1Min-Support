import { NextRequest, NextResponse } from "next/server";
import { scalekit } from "@/lib/scalekit";
import { db } from "@/db/client";
import { and, eq } from "drizzle-orm";
import { teamMembers } from "@/db/schema";

type MembershipEventPayload = {
  status?: string;
  state?: string;
  user?: { email?: string };
  organization?: { id?: string };
  membership?: {
    status?: string;
    state?: string;
    user?: { email?: string };
    organization?: { id?: string };
  };
};

const normalizeMembershipState = (payload: MembershipEventPayload) => {
  const rawState =
    payload.membership?.status ??
    payload.membership?.state ??
    payload.status ??
    payload.state;

  return typeof rawState === "string" ? rawState.trim().toLowerCase() : "";
};

const extractMemberIdentity = (payload: MembershipEventPayload) => {
  const email =
    payload.membership?.user?.email?.trim().toLowerCase() ??
    payload.user?.email?.trim().toLowerCase();
  const organizationId =
    payload.membership?.organization?.id?.trim() ??
    payload.organization?.id?.trim();

  return { email, organizationId };
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // Scalekit uses Svix under the hood — pass all three required headers
    const headers = {
      "webhook-id": req.headers.get("webhook-id") ?? "",
      "webhook-signature": req.headers.get("webhook-signature") ?? "",
      "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
    };

    if (!process.env.SCALEKIT_WEBHOOK_SECRET) {
      console.error("SCALEKIT_WEBHOOK_SECRET is not configured");
      return NextResponse.json({ error: "Webhook secret missing" }, { status: 500 });
    }

    await scalekit.verifyWebhookPayload(
      process.env.SCALEKIT_WEBHOOK_SECRET,
      headers,
      body
    );

    const event = JSON.parse(body) as {
      type: string;
      data: Record<string, unknown>;
    };

    switch (event.type) {
      case "user.organization_membership_created": {
        // Invitation created: keep member in pending state.
        break;
      }
      case "user.organization_membership_updated":
      case "user.organization_membership_accepted": {
        const payload = event.data as MembershipEventPayload;
        const membershipState = normalizeMembershipState(payload);
        const { email, organizationId } = extractMemberIdentity(payload);

        if (!email || !organizationId) {
          return NextResponse.json(
            { error: "Invalid membership payload" },
            { status: 400 }
          );
        }

        if (
          membershipState &&
          !["accepted", "active"].includes(membershipState)
        ) {
          break;
        }

        await db
          .update(teamMembers)
          .set({ status: "accepted" })
          .where(
            and(
              eq(teamMembers.user_email, email),
              eq(teamMembers.organization_id, organizationId)
            )
          );
        break;
      }

      default:
        console.log("Unhandled event type:", event.type);
    }

    const response = NextResponse.json({ success: true }, { status: 201 });
    response.headers.set("Access-Control-Allow-Origin", "*");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Webhook Error:", message);
    return NextResponse.json({ error: "Webhook failed" }, { status: 400 });
  }
}

export async function OPTIONS() {
  const response = NextResponse.json({}, { status: 200 });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, webhook-id, webhook-signature, webhook-timestamp"
  );
  return response;
}
