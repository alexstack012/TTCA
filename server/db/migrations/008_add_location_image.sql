BEGIN;

ALTER TABLE campaign_locations
    ADD COLUMN IF NOT EXISTS image_url TEXT;

COMMIT;