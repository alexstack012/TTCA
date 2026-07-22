BEGIN;

ALTER TABLE campaign_entities
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMIT;