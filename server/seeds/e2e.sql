INSERT INTO campaigns (source_key, name)
VALUES ('curse-of-strahd', 'Curse of Strahd E2E Fixture')
ON CONFLICT (source_key) DO NOTHING;

INSERT INTO campaign_sections (campaign_id, source_key, name, display_order)
SELECT id, 'e2e-fixtures', 'E2E Fixtures', 0
FROM campaigns
WHERE source_key = 'curse-of-strahd'
ON CONFLICT (campaign_id, source_key) DO NOTHING;
