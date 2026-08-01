BEGIN;

GRANT SELECT ON TABLE
    campaigns,
    campaign_sections
TO dnd_app;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    campaign_entities,
    campaign_entity_aliases,
    campaign_entity_section_entries,
    campaign_sessions,
    campaign_locations,
    campaign_session_locations,
    campaign_session_entities,
    campaign_plot_points,
    campaign_plot_point_sessions,
    campaign_plot_point_entities,
    campaign_lore_entries,
    campaign_lore_entry_entities
TO dnd_app;

COMMIT;
