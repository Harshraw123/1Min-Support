-- Human handover / conversation inbox foundation
-- Extends existing conversation + messages tables (no duplicate systems).

ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "workspace_id" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "visitor_id" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "widget_session_id" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "handling_mode" text DEFAULT 'AI';
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "assigned_agent_id" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "assigned_agent_email" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "assigned_agent_name" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "assigned_at" timestamp;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "escalation_reason" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "escalation_summary" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "escalated_at" timestamp;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "escalated_by" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "priority" text DEFAULT 'NORMAL';
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "section_id" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "last_customer_message" text;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "resolved_at" timestamp;
ALTER TABLE "conversation" ADD COLUMN IF NOT EXISTS "resolved_by" text;

-- Backfill tenant id from chatbot_id (today both are the Scalekit org id).
UPDATE "conversation"
SET "workspace_id" = "chatbot_id"
WHERE "workspace_id" IS NULL;

ALTER TABLE "conversation" ALTER COLUMN "workspace_id" SET NOT NULL;

UPDATE "conversation"
SET "status" = 'ai_active'
WHERE "status" = 'active' OR "status" IS NULL;

UPDATE "conversation"
SET "status" = 'resolved'
WHERE "status" = 'closed';

UPDATE "conversation"
SET "handling_mode" = 'AI'
WHERE "handling_mode" IS NULL;

UPDATE "conversation"
SET "priority" = 'NORMAL'
WHERE "priority" IS NULL;

ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sender_id" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sender_email" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "sender_name" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "client_message_id" text;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "metadata" jsonb;

CREATE INDEX IF NOT EXISTS "conversation_workspace_idx" ON "conversation" ("workspace_id");
CREATE INDEX IF NOT EXISTS "conversation_workspace_status_idx" ON "conversation" ("workspace_id", "status");
CREATE INDEX IF NOT EXISTS "conversation_workspace_assigned_idx" ON "conversation" ("workspace_id", "assigned_agent_email");
CREATE INDEX IF NOT EXISTS "conversation_visitor_idx" ON "conversation" ("chatbot_id", "visitor_id");
CREATE INDEX IF NOT EXISTS "messages_client_id_idx" ON "messages" ("conversation_id", "client_message_id");
