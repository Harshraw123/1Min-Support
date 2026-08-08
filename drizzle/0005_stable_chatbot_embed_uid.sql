WITH ranked_metadata AS (
  SELECT
    "id",
    row_number() OVER (
      PARTITION BY "chatbot_id"
      ORDER BY "created_at" ASC NULLS LAST, "id" ASC
    ) AS row_number
  FROM "chat_bot_metadata"
)
DELETE FROM "chat_bot_metadata"
WHERE "id" IN (
  SELECT "id"
  FROM ranked_metadata
  WHERE row_number > 1
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "chat_bot_metadata_chatbot_id_unique_idx"
ON "chat_bot_metadata" ("chatbot_id");
