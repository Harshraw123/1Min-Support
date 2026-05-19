CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"knowledge_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(384),
	"token_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"monthly_price_cents" integer DEFAULT 0 NOT NULL,
	"included_ai_messages" integer DEFAULT 0 NOT NULL,
	"included_ingestion_tokens" integer DEFAULT 0 NOT NULL,
	"included_embedding_tokens" integer DEFAULT 0 NOT NULL,
	"included_storage_mb" integer DEFAULT 0 NOT NULL,
	"included_sections" integer DEFAULT 0 NOT NULL,
	"included_team_members" integer DEFAULT 0 NOT NULL,
	"overage_ai_message_cents" integer DEFAULT 0 NOT NULL,
	"overage_1k_tokens_cents" integer DEFAULT 0 NOT NULL,
	"overage_1k_embedding_tokens_cents" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "workspace_subscriptions" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"status" text DEFAULT 'free' NOT NULL,
	"billing_provider" text DEFAULT 'none' NOT NULL,
	"provider_customer_id" text,
	"provider_subscription_id" text,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"section_id" text,
	"knowledge_id" text,
	"conversation_id" text,
	"message_id" text,
	"event_type" text NOT NULL,
	"provider" text,
	"model" text,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"embedding_tokens" integer,
	"chunk_count" integer,
	"message_count" integer,
	"metadata" jsonb,
	"billable" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "usage_daily_rollups" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" text NOT NULL,
	"section_id" text,
	"date" date NOT NULL,
	"ai_messages" integer DEFAULT 0 NOT NULL,
	"dashboard_test_messages" integer DEFAULT 0 NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"embedding_tokens" integer DEFAULT 0 NOT NULL,
	"chunks_created" integer DEFAULT 0 NOT NULL,
	"knowledge_sources_created" integer DEFAULT 0 NOT NULL,
	"estimated_cost_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_knowledge_idx" ON "knowledge_chunks" USING btree ("knowledge_id");
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_workspace_idx" ON "knowledge_chunks" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_embedding_hnsw_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX "knowledge_chunks_content_trgm_idx" ON "knowledge_chunks" USING gin ("content" gin_trgm_ops);
--> statement-breakpoint
CREATE INDEX "workspace_subscriptions_workspace_idx" ON "workspace_subscriptions" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "workspace_subscriptions_plan_idx" ON "workspace_subscriptions" USING btree ("plan_id");
--> statement-breakpoint
CREATE INDEX "usage_events_workspace_created_idx" ON "usage_events" USING btree ("workspace_id","created_at");
--> statement-breakpoint
CREATE INDEX "usage_events_section_created_idx" ON "usage_events" USING btree ("section_id","created_at");
--> statement-breakpoint
CREATE INDEX "usage_events_event_type_created_idx" ON "usage_events" USING btree ("event_type","created_at");
--> statement-breakpoint
CREATE INDEX "usage_events_billable_created_idx" ON "usage_events" USING btree ("billable","created_at");
--> statement-breakpoint
CREATE INDEX "usage_daily_rollups_workspace_date_idx" ON "usage_daily_rollups" USING btree ("workspace_id","date");
--> statement-breakpoint
CREATE INDEX "usage_daily_rollups_section_date_idx" ON "usage_daily_rollups" USING btree ("section_id","date");
