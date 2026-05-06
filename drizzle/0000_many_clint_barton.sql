CREATE TABLE "user" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"image" text,
	"created_at" text DEFAULT now(),
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "chatBotMetadata" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"color" text DEFAULT '#4f39f6' NOT NULL,
	"welcome_message" text DEFAULT 'Hi there, How can I help you today?',
	"avatar_src" text,
	"widget_id" text DEFAULT gen_random_uuid() NOT NULL,
	"created_at" text DEFAULT now(),
	CONSTRAINT "chatBotMetadata_user_email_unique" UNIQUE("user_email")
);
--> statement-breakpoint
CREATE TABLE "chatbots" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"website_url" text NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "knowledge" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"source_url" text,
	"meta_data" text,
	"created_at" text DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "metadata" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"business_name" text NOT NULL,
	"website_url" text NOT NULL,
	"external_links" text,
	"created_at" text DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sections" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"tone" text DEFAULT 'neutral' NOT NULL,
	"scope_label" text DEFAULT 'general' NOT NULL,
	"allowed_topics" text,
	"blocked_topics" text,
	"fallback_behavior" text DEFAULT 'escalate' NOT NULL,
	"source_ids" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" text DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_email" text NOT NULL,
	"name" text NOT NULL,
	"organization_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" text DEFAULT now()
);
