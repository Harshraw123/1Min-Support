import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";

/**
 * ================================
 * USERS
 * ================================
 */
export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  organization_id: text("organization_id").notNull(),

  name: text("name"),
  email: text("email").notNull().unique(),
  image: text("image"),

  created_at: timestamp("created_at").defaultNow(),
});

/**
 * ================================
 * BUSINESS METADATA
 * ================================
 */
export const metadata = pgTable("metadata", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  user_email: text("user_email").notNull(),

  business_name: text("business_name").notNull(),
  website_url: text("website_url").notNull(),

  external_links: jsonb("external_links"), // 🔥 instead of text

  created_at: timestamp("created_at").defaultNow(),
});

/**
 * ================================
 * KNOWLEDGE BASE
 * ================================
 */
export const knowledge = pgTable("knowledge", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  workspace_id: text("workspace_id").notNull(),

  title: text("title").notNull(),
  content: text("content").notNull(),

  type: text("type").notNull(), // website | text | upload

  status: text("status").notNull().default("active"),

  source_url: text("source_url"),

  meta_data: jsonb("meta_data"), // 🔥 instead of text

  created_at: timestamp("created_at").defaultNow(),
});

export const knowledge_chunks = pgTable(
  "knowledge_chunks",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    knowledge_id: text("knowledge_id").notNull(),
    workspace_id: text("workspace_id").notNull(),

    chunk_index: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 384 }),
    token_count: integer("token_count").notNull().default(0),

    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("knowledge_chunks_knowledge_idx").on(table.knowledge_id),
    index("knowledge_chunks_workspace_idx").on(table.workspace_id),
  ]
);

/**
 * ================================
 * SECTIONS (AI LAYERS)
 * ================================
 */
export const sections = pgTable("sections", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  chatbot_id: text("chatbot_id").notNull(), // 🔥 MUST

  workspace_id: text("workspace_id").notNull(),

  name: text("name").notNull(),
  description: text("description").notNull(),

  tone: text("tone").notNull().default("neutral"),
  scope_label: text("scope_label").notNull().default("general"),

  allowed_topics: jsonb("allowed_topics"),
  blocked_topics: jsonb("blocked_topics"),

  fallback_behavior: text("fallback_behavior")
    .notNull()
    .default("escalate"),

  source_ids: text("source_ids"),

  status: text("status").notNull().default("active"),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

/**
 * ================================
 * CHATBOTS
 * ================================
 */
export const chatbots = pgTable("chatbots", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  name: text("name").notNull(),
  website_url: text("website_url").notNull(),

  workspace_id: text("workspace_id").notNull(),

  created_at: timestamp("created_at").defaultNow(),
});

/**
 * ================================
 * CHATBOT UI CONFIG (WIDGET)
 * ================================
 */
export const chat_bot_metadata = pgTable("chat_bot_metadata", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  widget_id: text("widget_id")
    .notNull()
    .unique()
    .default(sql`gen_random_uuid()`),

  chatbot_id: text("chatbot_id").notNull(), // 🔥 relation

  name: text("name"),

  color: text("color").notNull().default("#4f39f6"),
  welcome_message: text("welcome_message").default(
    "Hi there, How can I help you today?"
  ),

  avatar_src: text("avatar_src"),

  default_section_id: text("default_section_id"),

  allowed_domain: text("allowed_domain"),

  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
});

/**
 * ================================
 * TEAM MEMBERS
 * ================================
 */
export const team_members = pgTable("team_members", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  organization_id: text("organization_id").notNull(),

  user_email: text("user_email").notNull(),
  name: text("name").notNull(),

  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("pending"),

  created_at: timestamp("created_at").defaultNow(),
});

export const conversation = pgTable(
  "conversation",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    chatbot_id: text("chatbot_id").notNull(),

    user_email: text("user_email"),

    visitor_ip: text("visitor_ip"),

    name: text("name"),

    status: text("status", {
      enum: ["active", "closed"],
    }).default("active"),

    last_message_at: timestamp("last_message_at")
      .defaultNow(),

    created_at: timestamp("created_at")
      .defaultNow(),
  },

  (table) => [
    index("conversation_chatbot_idx").on(table.chatbot_id),
    index("conversation_created_idx").on(table.created_at),
  ]
);

/* =====================================================
   MESSAGES
===================================================== */

export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    conversation_id: text("conversation_id")
      .notNull(),

    role: text("role", {
      enum: ["user", "assistant"],
    }).notNull(),

    content: text("content").notNull(),

    is_streaming: boolean("is_streaming")
      .default(false),

    created_at: timestamp("created_at")
      .defaultNow(),
  },

  (table) => [
    index("messages_conversation_idx").on(table.conversation_id),
    index("messages_created_idx").on(table.created_at),
  ]
);

/**
 * ================================
 * BILLING AND USAGE
 * ================================
 */
export const plans = pgTable("plans", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  name: text("name").notNull(),
  monthly_price_cents: integer("monthly_price_cents").notNull().default(0),

  included_ai_messages: integer("included_ai_messages").notNull().default(0),
  included_ingestion_tokens: integer("included_ingestion_tokens").notNull().default(0),
  included_embedding_tokens: integer("included_embedding_tokens").notNull().default(0),
  included_storage_mb: integer("included_storage_mb").notNull().default(0),
  included_sections: integer("included_sections").notNull().default(0),
  included_team_members: integer("included_team_members").notNull().default(0),

  overage_ai_message_cents: integer("overage_ai_message_cents").notNull().default(0),
  overage_1k_tokens_cents: integer("overage_1k_tokens_cents").notNull().default(0),
  overage_1k_embedding_tokens_cents: integer("overage_1k_embedding_tokens_cents")
    .notNull()
    .default(0),

  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const workspace_subscriptions = pgTable(
  "workspace_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: text("workspace_id").notNull(),
    plan_id: text("plan_id").notNull(),

    status: text("status", {
      enum: ["trialing", "active", "past_due", "canceled", "free"],
    })
      .notNull()
      .default("free"),

    billing_provider: text("billing_provider", {
      enum: ["stripe", "manual", "none"],
    })
      .notNull()
      .default("none"),

    provider_customer_id: text("provider_customer_id"),
    provider_subscription_id: text("provider_subscription_id"),
    current_period_start: timestamp("current_period_start"),
    current_period_end: timestamp("current_period_end"),
    cancel_at_period_end: boolean("cancel_at_period_end").notNull().default(false),

    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("workspace_subscriptions_workspace_idx").on(table.workspace_id),
    index("workspace_subscriptions_plan_idx").on(table.plan_id),
  ]
);

export const usage_events = pgTable(
  "usage_events",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: text("workspace_id").notNull(),
    section_id: text("section_id"),
    knowledge_id: text("knowledge_id"),
    conversation_id: text("conversation_id"),
    message_id: text("message_id"),

    event_type: text("event_type").notNull(),
    provider: text("provider", {
      enum: ["groq", "huggingface", "internal"],
    }),
    model: text("model"),

    prompt_tokens: integer("prompt_tokens"),
    completion_tokens: integer("completion_tokens"),
    total_tokens: integer("total_tokens"),
    embedding_tokens: integer("embedding_tokens"),
    chunk_count: integer("chunk_count"),
    message_count: integer("message_count"),

    metadata: jsonb("metadata"),
    billable: boolean("billable").notNull().default(true),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("usage_events_workspace_created_idx").on(table.workspace_id, table.created_at),
    index("usage_events_section_created_idx").on(table.section_id, table.created_at),
    index("usage_events_event_type_created_idx").on(table.event_type, table.created_at),
    index("usage_events_billable_created_idx").on(table.billable, table.created_at),
  ]
);

export const usage_daily_rollups = pgTable(
  "usage_daily_rollups",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: text("workspace_id").notNull(),
    section_id: text("section_id"),
    date: date("date").notNull(),

    ai_messages: integer("ai_messages").notNull().default(0),
    dashboard_test_messages: integer("dashboard_test_messages").notNull().default(0),
    prompt_tokens: integer("prompt_tokens").notNull().default(0),
    completion_tokens: integer("completion_tokens").notNull().default(0),
    total_tokens: integer("total_tokens").notNull().default(0),
    embedding_tokens: integer("embedding_tokens").notNull().default(0),
    chunks_created: integer("chunks_created").notNull().default(0),
    knowledge_sources_created: integer("knowledge_sources_created").notNull().default(0),
    estimated_cost_cents: integer("estimated_cost_cents").notNull().default(0),

    created_at: timestamp("created_at").defaultNow(),
    updated_at: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("usage_daily_rollups_workspace_date_idx").on(table.workspace_id, table.date),
    index("usage_daily_rollups_section_date_idx").on(table.section_id, table.date),
  ]
);

/* =====================================================
   WIDGETS
===================================================== */

export const widgets = pgTable(
  "widgets",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    organization_id: text("organization_id")
      .notNull(),

    name: text("name")
      .notNull(),

    public_key: text("public_key")
      .notNull(),

    allowed_domains: text("allowed_domains")
      .array(),

    status: text("status", {
      enum: ["active", "disabled"],
    }).default("active"),

    created_at: timestamp("created_at")
      .defaultNow(),
  },

  (table) => [
    index("widget_org_idx").on(table.organization_id),
  ]
);
// Backward-compatible aliases for older imports.
export const User = users;
export const teamMembers = team_members;
export const chatBotMetadata = chat_bot_metadata;
