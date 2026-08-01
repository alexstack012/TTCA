BEGIN;

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    source_key TEXT NOT NULL,
    name TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE (campaign_id, source_key)
);

CREATE TABLE IF NOT EXISTS campaign_entities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    source_key TEXT NOT NULL,
    name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK (
        entity_type IN ('npc', 'creature', 'deity', 'artifact', 'group', 'supernatural_entity')
    ),
    visibility TEXT NOT NULL DEFAULT 'dm_only' CHECK (
        visibility IN ('dm_only', 'party', 'public')
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (campaign_id, source_key)
);

CREATE TABLE IF NOT EXISTS campaign_entity_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES campaign_entities(id) ON DELETE CASCADE,
    alias TEXT NOT NULL,
    UNIQUE (entity_id, alias)
);

CREATE TABLE IF NOT EXISTS campaign_entity_section_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL REFERENCES campaign_entities(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES campaign_sections(id) ON DELETE CASCADE,
    details_type TEXT NOT NULL CHECK (
        details_type IN ('notableEvents', 'notableInformation', 'relevance')
    ),
    details_value TEXT NOT NULL,
    status TEXT NOT NULL,
    context_type TEXT CHECK (
        context_type IS NULL OR context_type IN ('firstMeeting', 'firstAppearance', 'connection')
    ),
    context_value TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (entity_id, section_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_sections_campaign_order
    ON campaign_sections (campaign_id, display_order);
CREATE INDEX IF NOT EXISTS idx_campaign_entities_campaign_name
    ON campaign_entities (campaign_id, LOWER(name));
CREATE INDEX IF NOT EXISTS idx_campaign_entities_visibility
    ON campaign_entities (campaign_id, visibility);
CREATE INDEX IF NOT EXISTS idx_campaign_entity_aliases_entity
    ON campaign_entity_aliases (entity_id);
CREATE INDEX IF NOT EXISTS idx_campaign_entity_entries_section
    ON campaign_entity_section_entries (section_id);

COMMIT;
