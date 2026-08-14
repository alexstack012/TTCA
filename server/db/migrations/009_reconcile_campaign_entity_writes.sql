BEGIN;

-- Some production databases predate the reproducible migration chain. CREATE
-- TABLE IF NOT EXISTS in the baseline cannot reconcile columns on those tables,
-- and an already-recorded grant migration will not be run again.
ALTER TABLE campaign_entities
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS image_url TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT;

GRANT SELECT ON TABLE
    campaigns,
    campaign_sections
TO dnd_app;

-- Entity creation can add a user-defined section. Existing section names are
-- only read; updates and deletion remain controlled by the entity workflows.
GRANT INSERT ON TABLE campaign_sections TO dnd_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    campaign_entities,
    campaign_entity_aliases,
    campaign_entity_section_entries
TO dnd_app;

COMMIT;
