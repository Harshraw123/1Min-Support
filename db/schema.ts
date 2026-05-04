

import { sql } from "drizzle-orm";
import { pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";


export const User = pgTable("user", {
  /* Unique identifier for the user using UUID */
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
    
  /* The ScaleKit Organization ID extracted from claims */
  organization_id: text("organization_id").notNull(),
  

  name: text("name"),
  email: text("email").notNull().unique(),
  image: text("image"),
  

  created_at: text("created_at").default(sql`now()`),
});

// Drizzle mein sql ek tag hai jo plain text ko "Database Command" mein badalta hai.

// Jab aap Postgres use karte hain, toh database ke apne kuch functions hote hain (jaise time nikalne ke liye now() ya unique ID ke liye gen_random_uuid()).

// Agar aap sirf "now()" likhenge, toh Drizzle use ek normal text (string) samjhega. Lekin jab aap sqlnow()`` likhte hain, toh Drizzle ko pata chalta hai ki:

// "Bhai, ye koi text nahi hai, ye Postgres ka order hai jo seedha database par chalana hai."


export const metadata = pgTable("metadata", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user_email: text("user_email").notNull(),
  business_name: text("business_name").notNull(),
  website_url: text("website_url").notNull(),
  external_links: text("external_links"),
  created_at: text("created_at").default(sql`now()`),
});


export const knowledge = pgTable("knowledge", {
  
  // Unique identifier — same pattern as your User & metadata tables
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),


  user_email: text("user_email").notNull(),


  workspace_id: text("workspace_id").notNull(),

  // Display name of the knowledge source
  // e.g. "Company Pricing Page" or the filename
  title: text("title").notNull(),

  // Summarized markdown content (processed by Gemini model)

  content: text("content").notNull(),

  // Type of knowledge source
  // 'website' | 'text' | 'upload'
  type: text("type").notNull(),

  status:text('status').notNull().default('active'),

  
  // Used for duplicate URL checking in the modal
  source_url: text("source_url"),

  meta_data:text('meta_data'),


  created_at: text("created_at").default(sql`now()`),
});

export const sections = pgTable("sections", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),

  user_email: text("user_email").notNull(),
  workspace_id: text("workspace_id").notNull(),

  name: text("name").notNull(),
  description: text("description").notNull(),

  tone: text("tone").notNull().default("neutral"),
  scope_label: text("scope_label").notNull().default("general"),

  allowed_topics: text("allowed_topics"),
  blocked_topics: text("blocked_topics"),
  fallback_behavior: text("fallback_behavior").notNull().default("escalate"),

  /**
   * JSON string array of knowledge ids.
   * Stored as text to keep schema simple and avoid jsonb dependency here.
   */
  source_ids: text("source_ids"),

  status: text("status").notNull().default("active"),
  created_at: text("created_at").default(sql`now()`),
});

export const chatBots = pgTable("chatbots", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  website_url: text("website_url").notNull(),
  user_email: varchar("user_email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// 2. Metadata Table (For Color and Welcome Message)
export const chatBotMetadata = pgTable("chatBotMetadata", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user_email: text("user_email").notNull().unique(),
  color: text("color").notNull().default("#4f39f6"),
  welcome_message: text("welcome_message").default(
    "Hi there, How can I help you today?"
  ),
  avatar_src: text("avatar_src"),
  widget_id: text("widget_id").notNull().default(sql`gen_random_uuid()`),
  created_at: text("created_at").default(sql`now()`),
});


export const teamMembers = pgTable("team_members", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  user_email: text("user_email").notNull(),
  name: text("name").notNull(),
  organization_id: text("organization_id").notNull(),
  role: text("role").notNull().default("member"),
  status: text("status").notNull().default("pending"),
  created_at: text("created_at").default(sql`now()`),
});




