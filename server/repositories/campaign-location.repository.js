import { pool } from '../db.js';

const campaignLocationsQuery = `
  WITH target_campaign AS (
    SELECT id, source_key FROM campaigns WHERE source_key = $1
  ),
  session_links AS (
    SELECT link.location_id,
      jsonb_agg(jsonb_build_object(
        'id', session.id,
        'sessionNumber', session.session_number,
        'sessionName', session.session_name,
        'startedOn', session.started_on
      ) ORDER BY session.session_number) AS sessions
    FROM campaign_session_locations AS link
    JOIN campaign_sessions AS session ON session.id = link.session_id
    JOIN target_campaign AS campaign ON campaign.id = session.campaign_id
    WHERE $2 = 'editor' OR session.visibility <> 'dm_only'
    GROUP BY link.location_id
  )
  SELECT campaign.source_key AS "campaignKey",
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', location.id,
      'sourceKey', location.source_key,
      'name', location.name,
      'description', location.description,
      'visibility', location.visibility,
      'createdAt', location.created_at,
      'updatedAt', location.updated_at,
      'sessions', COALESCE(session_links.sessions, '[]'::jsonb)
    ) ORDER BY location.name) FILTER (WHERE location.id IS NOT NULL), '[]'::jsonb) AS locations
  FROM target_campaign AS campaign
  LEFT JOIN campaign_locations AS location
    ON location.campaign_id = campaign.id
    AND ($2 = 'editor' OR location.visibility <> 'dm_only')
  LEFT JOIN session_links ON session_links.location_id = location.id
  GROUP BY campaign.id, campaign.source_key
`;

export async function findCampaignLocations(campaignKey, role) {
  const result = await pool.query(campaignLocationsQuery, [campaignKey, role]);
  return result.rows[0] ?? null;
}

export async function createCampaignLocation(campaignKey, location) {
  const result = await pool.query(
    `WITH campaign AS (
       SELECT id FROM campaigns WHERE source_key = $1
     ), unique_key AS (
       SELECT CASE
         WHEN EXISTS (
           SELECT 1 FROM campaign_locations
           WHERE campaign_id = (SELECT id FROM campaign) AND source_key = $2
         ) THEN $2 || '-' || LEFT(gen_random_uuid()::text, 8)
         ELSE $2
       END AS value
     )
     INSERT INTO campaign_locations (campaign_id, source_key, name, description, visibility)
     SELECT campaign.id, unique_key.value, $3, NULLIF($4, ''), $5
     FROM campaign CROSS JOIN unique_key
     RETURNING id`,
    [campaignKey, location.sourceKey, location.name, location.description, location.visibility],
  );
  if (!result.rowCount) return null;
  const campaign = await findCampaignLocations(campaignKey, 'editor');
  return campaign?.locations.find((item) => item.id === result.rows[0].id) ?? null;
}

export async function updateCampaignLocation(campaignKey, locationId, location) {
  const result = await pool.query(
    `UPDATE campaign_locations
     SET name = $3,
         description = NULLIF($4, ''),
         visibility = $5,
         updated_at = NOW()
     WHERE id = $2
       AND campaign_id = (SELECT id FROM campaigns WHERE source_key = $1)
     RETURNING id`,
    [campaignKey, locationId, location.name, location.description, location.visibility],
  );
  if (!result.rowCount) return null;
  const campaign = await findCampaignLocations(campaignKey, 'editor');
  return campaign?.locations.find((item) => item.id === locationId) ?? null;
}

export async function deleteCampaignLocation(campaignKey, locationId) {
  const result = await pool.query(
    `DELETE FROM campaign_locations
     WHERE id = $2
       AND campaign_id = (SELECT id FROM campaigns WHERE source_key = $1)
     RETURNING id`,
    [campaignKey, locationId],
  );
  return result.rowCount === 1;
}
