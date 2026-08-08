ALTER TABLE "plans" ADD COLUMN IF NOT EXISTS "slug" text;

UPDATE "plans" SET "slug" = lower(replace("name", ' ', '_')) WHERE "slug" IS NULL;

INSERT INTO "plans" ("id", "slug", "name", "monthly_price_cents", "included_ai_messages", "is_active")
VALUES
  ('plan_free', 'free', 'Free', 0, 100, true),
  ('plan_pro', 'pro', 'Pro', 2900, 5000, true)
ON CONFLICT ("id") DO UPDATE SET
  "slug" = EXCLUDED."slug",
  "name" = EXCLUDED."name",
  "included_ai_messages" = EXCLUDED."included_ai_messages",
  "monthly_price_cents" = EXCLUDED."monthly_price_cents",
  "is_active" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "plans_slug_unique" ON "plans" ("slug");

DELETE FROM "workspace_subscriptions" a
USING "workspace_subscriptions" b
WHERE a.workspace_id = b.workspace_id
  AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_subscriptions_workspace_unique"
  ON "workspace_subscriptions" ("workspace_id");

UPDATE "workspace_subscriptions"
SET "billing_provider" = 'none'
WHERE "billing_provider" IS NULL;

CREATE TABLE IF NOT EXISTS "workspace_usage_monthly" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" text NOT NULL,
  "year_month" text NOT NULL,
  "ai_messages" integer NOT NULL DEFAULT 0,
  "updated_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "workspace_usage_monthly_workspace_idx"
  ON "workspace_usage_monthly" ("workspace_id");

CREATE UNIQUE INDEX IF NOT EXISTS "workspace_usage_monthly_unique_idx"
  ON "workspace_usage_monthly" ("workspace_id", "year_month");

CREATE TABLE IF NOT EXISTS "billing_webhook_events" (
  "id" text PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" text NOT NULL DEFAULT 'lemon_squeezy',
  "event_id" text NOT NULL UNIQUE,
  "event_name" text NOT NULL,
  "payload" jsonb,
  "processed_at" timestamp DEFAULT now()
);
