import { db } from "@/db/client";
import { plans, workspace_subscriptions } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { isMissingRelationError } from "@/lib/db/pgErrors";

export async function getWorkspacePlan(workspaceId: string) {
  try {
    const [subscription] = await db
      .select()
      .from(workspace_subscriptions)
      .where(eq(workspace_subscriptions.workspace_id, workspaceId))
      .orderBy(desc(workspace_subscriptions.created_at))
      .limit(1);

    if (!subscription) {
      return {
        subscription: null,
        plan: null,
      };
    }

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, subscription.plan_id))
      .limit(1);

    return {
      subscription,
      plan: plan ?? null,
    };
  } catch (error) {
    if (isMissingRelationError(error)) {
      return {
        subscription: null,
        plan: null,
      };
    }
    throw error;
  }
}
