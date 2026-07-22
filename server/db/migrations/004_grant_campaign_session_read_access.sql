BEGIN;

GRANT SELECT ON TABLE
    campaign_sessions,
    campaign_locations,
    campaign_session_locations,
    campaign_session_entities
TO dnd_app;

COMMIT;
