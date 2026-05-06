import { sql } from "drizzle-orm";
import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

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

// Backward-compatible aliases for older imports.
export const User = users;
export const teamMembers = team_members;
export const chatBotMetadata = chat_bot_metadata;