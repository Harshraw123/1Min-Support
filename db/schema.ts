

import { sql } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";


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