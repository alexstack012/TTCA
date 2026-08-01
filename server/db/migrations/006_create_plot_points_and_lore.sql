BEGIN;

-- =========================================================
-- PLOT POINTS
-- =========================================================

CREATE TABLE IF NOT EXISTS campaign_plot_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    campaign_id UUID NOT NULL
        REFERENCES campaigns(id)
        ON DELETE CASCADE,

    source_key TEXT NOT NULL,

    title TEXT NOT NULL,

    summary TEXT,

    description TEXT NOT NULL DEFAULT '',

    status TEXT NOT NULL DEFAULT 'open'
        CHECK (
            status IN (
                'open',
                'in_progress',
                'resolved',
                'abandoned'
            )
        ),

    priority TEXT NOT NULL DEFAULT 'normal'
        CHECK (
            priority IN (
                'low',
                'normal',
                'high',
                'critical'
            )
        ),

    visibility TEXT NOT NULL DEFAULT 'dm_only'
        CHECK (
            visibility IN (
                'dm_only',
                'party',
                'public'
            )
        ),

    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (
        campaign_id,
        source_key
    )
);

-- Links plot points to campaign sessions.
CREATE TABLE IF NOT EXISTS campaign_plot_point_sessions (
    plot_point_id UUID NOT NULL
        REFERENCES campaign_plot_points(id)
        ON DELETE CASCADE,

    session_id UUID NOT NULL
        REFERENCES campaign_sessions(id)
        ON DELETE CASCADE,

    relationship_type TEXT NOT NULL DEFAULT 'mentioned'
        CHECK (
            relationship_type IN (
                'introduced',
                'mentioned',
                'advanced',
                'complicated',
                'resolved'
            )
        ),

    notes TEXT,

    PRIMARY KEY (
        plot_point_id,
        session_id
    )
);

-- Links plot points to NPCs, creatures, gods, artifacts, groups, etc.
CREATE TABLE IF NOT EXISTS campaign_plot_point_entities (
    plot_point_id UUID NOT NULL
        REFERENCES campaign_plot_points(id)
        ON DELETE CASCADE,

    entity_id UUID NOT NULL
        REFERENCES campaign_entities(id)
        ON DELETE CASCADE,

    relationship_label TEXT,

    notes TEXT,

    PRIMARY KEY (
        plot_point_id,
        entity_id
    )
);

-- =========================================================
-- LORE
-- =========================================================

CREATE TABLE IF NOT EXISTS campaign_lore_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    campaign_id UUID NOT NULL
        REFERENCES campaigns(id)
        ON DELETE CASCADE,

    source_key TEXT NOT NULL,

    title TEXT NOT NULL,

    summary TEXT,

    content TEXT NOT NULL DEFAULT '',

    category TEXT NOT NULL DEFAULT 'other'
        CHECK (
            category IN (
                'character',
                'deity',
                'faction',
                'location',
                'artifact',
                'history',
                'event',
                'culture',
                'magic',
                'other'
            )
        ),

    visibility TEXT NOT NULL DEFAULT 'dm_only'
        CHECK (
            visibility IN (
                'dm_only',
                'party',
                'public'
            )
        ),

    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (
        campaign_id,
        source_key
    )
);

-- Links lore entries to NPCs, gods, villains, artifacts, factions, etc.
CREATE TABLE IF NOT EXISTS campaign_lore_entry_entities (
    lore_entry_id UUID NOT NULL
        REFERENCES campaign_lore_entries(id)
        ON DELETE CASCADE,

    entity_id UUID NOT NULL
        REFERENCES campaign_entities(id)
        ON DELETE CASCADE,

    relationship_label TEXT,

    notes TEXT,

    PRIMARY KEY (
        lore_entry_id,
        entity_id
    )
);

-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_plot_points_campaign_status
    ON campaign_plot_points (
        campaign_id,
        status
    );

CREATE INDEX IF NOT EXISTS idx_plot_points_campaign_priority
    ON campaign_plot_points (
        campaign_id,
        priority
    );

CREATE INDEX IF NOT EXISTS idx_plot_points_campaign_visibility
    ON campaign_plot_points (
        campaign_id,
        visibility
    );

CREATE INDEX IF NOT EXISTS idx_plot_points_campaign_title
    ON campaign_plot_points (
        campaign_id,
        LOWER(title)
    );

CREATE INDEX IF NOT EXISTS idx_plot_point_sessions_session
    ON campaign_plot_point_sessions (
        session_id
    );

CREATE INDEX IF NOT EXISTS idx_plot_point_entities_entity
    ON campaign_plot_point_entities (
        entity_id
    );

CREATE INDEX IF NOT EXISTS idx_lore_entries_campaign_category
    ON campaign_lore_entries (
        campaign_id,
        category
    );

CREATE INDEX IF NOT EXISTS idx_lore_entries_campaign_visibility
    ON campaign_lore_entries (
        campaign_id,
        visibility
    );

CREATE INDEX IF NOT EXISTS idx_lore_entries_campaign_title
    ON campaign_lore_entries (
        campaign_id,
        LOWER(title)
    );

CREATE INDEX IF NOT EXISTS idx_lore_entry_entities_entity
    ON campaign_lore_entry_entities (
        entity_id
    );

COMMIT;