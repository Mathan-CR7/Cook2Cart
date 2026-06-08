-- Run this on cook2cart_ai_db to create the AI response audit table.
-- This table intentionally does not store ingredients JSON or instructions JSON.

CREATE TABLE IF NOT EXISTS ai_recipe_response (
    id BIGSERIAL PRIMARY KEY,
    recipe_id BIGINT,
    english_transcript TEXT,
    raw_ai_response TEXT,
    language_detected VARCHAR(255),
    confidence_score DOUBLE PRECISION,
    created_at TIMESTAMP
);

-- Optional one-time copy from the previous table, if it exists.
DO $$
BEGIN
    IF to_regclass('public.ai_recipe_responses') IS NOT NULL THEN
        INSERT INTO ai_recipe_response (
            id,
            english_transcript,
            raw_ai_response,
            language_detected,
            confidence_score,
            created_at
        )
        SELECT
            old.id,
            old.english_transcript,
            json_build_object(
                'languageDetected', old.language_detected,
                'englishTranscript', old.english_transcript
            )::text,
            old.language_detected,
            NULL,
            now()
        FROM ai_recipe_responses old
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- Keep this commented until you verify the new table has the data you need.
-- DROP TABLE ai_recipe_responses;
