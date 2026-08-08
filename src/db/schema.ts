import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
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
 * CHATBOT UI CONFIG (WIDGET)
 * Real widget identity lives here (widget_id). No separate unused widgets/chatbots tables.
 * ================================
 */
export const chat_bot_metadata = pgTable(
  "chat_bot_metadata",
  {
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
  },
  (table) => [
    uniqueIndex("chat_bot_metadata_chatbot_id_unique_idx").on(table.chatbot_id),
  ]
);

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

/**
 * Customer support conversations.
 * workspace_id === organization_id (tenant). chatbot_id is the bot for that workspace
 * (today both are the Scalekit org id — keep both so we can split later without rewrite).
 *
 * Lifecycle (handling_mode owns AI vs human; status is the queue/lifecycle label):
 *   ai_active → escalated (unassigned queue) → human_handling → resolved
 * Customer messages after resolve reopen to ai_active unless an agent still owns it.
 */
export const conversation = pgTable(
  "conversation",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    chatbot_id: text("chatbot_id").notNull(),
    workspace_id: text("workspace_id").notNull(),

    /** Stable browser visitor id (localStorage) — survives refresh better than JWT sessionId. */
    visitor_id: text("visitor_id"),
    /** JWT sessionId from /api/widget/session (rotates every 2h). */
    widget_session_id: text("widget_session_id"),

    user_email: text("user_email"),
    visitor_ip: text("visitor_ip"),
    name: text("name"),

    status: text("status", {
      enum: ["ai_active", "escalated", "human_handling", "resolved", "active", "closed"],
    })
      .notNull()
      .default("ai_active"),

    /** Who is allowed to auto-reply: AI or HUMAN. Human takeover always sets HUMAN. */
    handling_mode: text("handling_mode", {
      enum: ["AI", "HUMAN"],
    })
      .notNull()
      .default("AI"),

    assigned_agent_id: text("assigned_agent_id"),
    assigned_agent_email: text("assigned_agent_email"),
    assigned_agent_name: text("assigned_agent_name"),
    assigned_at: timestamp("assigned_at"),

    escalation_reason: text("escalation_reason"),
    escalation_summary: text("escalation_summary"),
    escalated_at: timestamp("escalated_at"),
    escalated_by: text("escalated_by"),

    priority: text("priority", {
      enum: ["LOW", "NORMAL", "HIGH", "URGENT"],
    })
      .notNull()
      .default("NORMAL"),

    section_id: text("section_id"),
    last_customer_message: text("last_customer_message"),

    resolved_at: timestamp("resolved_at"),
    resolved_by: text("resolved_by"),

    last_message_at: timestamp("last_message_at").defaultNow(),
    created_at: timestamp("created_at").defaultNow(),
  },

  (table) => [
    index("conversation_chatbot_idx").on(table.chatbot_id),
    index("conversation_workspace_idx").on(table.workspace_id),
    index("conversation_workspace_status_idx").on(table.workspace_id, table.status),
    index("conversation_workspace_assigned_idx").on(
      table.workspace_id,
      table.assigned_agent_email
    ),
    index("conversation_visitor_idx").on(table.chatbot_id, table.visitor_id),
    index("conversation_created_idx").on(table.created_at),
  ]
);

/* =====================================================
   MESSAGES
   role:
     user      = customer (widget)
     assistant = AI
     agent     = human support agent
     system    = lifecycle events (escalation, assignment, resolve)
===================================================== */

export const messages = pgTable(
  "messages",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    conversation_id: text("conversation_id").notNull(),

    role: text("role", {
      enum: ["user", "assistant", "agent", "system"],
    }).notNull(),

    content: text("content").notNull(),

    sender_id: text("sender_id"),
    sender_email: text("sender_email"),
    sender_name: text("sender_name"),

    /**
     * Client-generated id for idempotent sends (widget / agent UI).
     * Unique per conversation when present — prevents duplicate inserts on retries.
     */
    client_message_id: text("client_message_id"),

    metadata: jsonb("metadata"),

    is_streaming: boolean("is_streaming").default(false),

    created_at: timestamp("created_at").defaultNow(),
  },

  (table) => [
    index("messages_conversation_idx").on(table.conversation_id),
    index("messages_created_idx").on(table.created_at),
    index("messages_client_id_idx").on(table.conversation_id, table.client_message_id),
  ]
);

/**
 * ================================
 * BILLING (simple Free + Pro via Lemon Squeezy)
 * Quota source of truth = workspace_usage_monthly.ai_messages only.
 * ================================
 */
export const plans = pgTable("plans", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  /** Stable key used in code: free | pro */
  slug: text("slug").notNull().unique(),

  name: text("name").notNull(),
  monthly_price_cents: integer("monthly_price_cents").notNull().default(0),

  /** Only hard quota for v1 */
  included_ai_messages: integer("included_ai_messages").notNull().default(0),

  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").defaultNow(),
});

export const workspace_subscriptions = pgTable(
  "workspace_subscriptions",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: text("workspace_id").notNull().unique(),
    plan_id: text("plan_id").notNull(),

    status: text("status", {
      enum: ["trialing", "active", "past_due", "canceled", "free"],
    })
      .notNull()
      .default("free"),

    billing_provider: text("billing_provider", {
      enum: ["lemon_squeezy", "manual", "none"],
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

/**
 * Fast O(1) monthly AI message counter — the only hard quota for v1.
 * year_month format: YYYY-MM (UTC).
 */
export const workspace_usage_monthly = pgTable(
  "workspace_usage_monthly",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),

    workspace_id: text("workspace_id").notNull(),
    year_month: text("year_month").notNull(),
    ai_messages: integer("ai_messages").notNull().default(0),

    updated_at: timestamp("updated_at").defaultNow(),
    created_at: timestamp("created_at").defaultNow(),
  },
  (table) => [
    index("workspace_usage_monthly_workspace_idx").on(table.workspace_id),
    uniqueIndex("workspace_usage_monthly_unique_idx").on(
      table.workspace_id,
      table.year_month
    ),
  ]
);

/** Idempotency for Lemon Squeezy webhook deliveries. */
export const billing_webhook_events = pgTable("billing_webhook_events", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  provider: text("provider").notNull().default("lemon_squeezy"),
  event_id: text("event_id").notNull().unique(),
  event_name: text("event_name").notNull(),
  payload: jsonb("payload"),
  processed_at: timestamp("processed_at").defaultNow(),
});

// Backward-compatible aliases for older imports.
export const User = users;
export const teamMembers = team_members;
export const chatBotMetadata = chat_bot_metadata;
