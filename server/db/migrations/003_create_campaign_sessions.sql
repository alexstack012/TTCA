BEGIN;

CREATE TABLE IF NOT EXISTS campaign_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    campaign_id UUID NOT NULL
        REFERENCES campaigns(id)
        ON DELETE CASCADE,

    session_number INTEGER NOT NULL
        CHECK (session_number > 0),

    is_multi_day BOOLEAN NOT NULL DEFAULT FALSE,

    session_name TEXT NOT NULL,

    visibility TEXT NOT NULL DEFAULT 'dm_only'
        CHECK (
            visibility IN (
                'dm_only',
                'party',
                'public'
            )
        ),

    description TEXT NOT NULL DEFAULT '',

    started_on DATE,
    ended_on DATE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (campaign_id, session_number),

    CHECK (
        ended_on IS NULL
        OR started_on IS NULL
        OR ended_on >= started_on
    )
);

CREATE TABLE IF NOT EXISTS campaign_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    campaign_id UUID NOT NULL
        REFERENCES campaigns(id)
        ON DELETE CASCADE,

    source_key TEXT NOT NULL,
    name TEXT NOT NULL,

    description TEXT,
    image_url TEXT,

    visibility TEXT NOT NULL DEFAULT 'dm_only'
        CHECK (
            visibility IN (
                'dm_only',
                'party',
                'public'
            )
        ),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (campaign_id, source_key)
);

CREATE TABLE IF NOT EXISTS campaign_session_locations (
    session_id UUID NOT NULL
        REFERENCES campaign_sessions(id)
        ON DELETE CASCADE,

    location_id UUID NOT NULL
        REFERENCES campaign_locations(id)
        ON DELETE CASCADE,

    PRIMARY KEY (session_id, location_id)
);

CREATE TABLE IF NOT EXISTS campaign_session_entities (
    session_id UUID NOT NULL
        REFERENCES campaign_sessions(id)
        ON DELETE CASCADE,

    entity_id UUID NOT NULL
        REFERENCES campaign_entities(id)
        ON DELETE CASCADE,

    PRIMARY KEY (session_id, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_sessions_campaign_number
    ON campaign_sessions (campaign_id, session_number);

CREATE INDEX IF NOT EXISTS idx_campaign_sessions_visibility
    ON campaign_sessions (campaign_id, visibility);

CREATE INDEX IF NOT EXISTS idx_campaign_locations_campaign_name
    ON campaign_locations (campaign_id, LOWER(name));

CREATE INDEX IF NOT EXISTS idx_campaign_session_locations_location
    ON campaign_session_locations (location_id);

CREATE INDEX IF NOT EXISTS idx_campaign_session_entities_entity
    ON campaign_session_entities (entity_id);

COMMIT;
