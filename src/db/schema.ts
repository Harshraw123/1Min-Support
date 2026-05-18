import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";

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