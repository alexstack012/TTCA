import { pool } from '../db.js';

const campaignSessionsQuery = `
  WITH target_campaign AS (
    SELECT id, source_key FROM campaigns WHERE source_key = $1
  ),
  location_rows AS (
    SELECT DISTINCT link.session_id, location.id, location.source_key, location.name,
      location.description, location.visibility
    FROM campaign_session_locations AS link
    JOIN campaign_locations AS location ON location.id = link.location_id
    JOIN target_campaign AS campaign ON campaign.id = location.campaign_id
    WHERE $2 = 'editor' OR location.visibility <> 'dm_only'
  ),
  locations AS (
    SELECT session_id,
      jsonb_agg(jsonb_build_object(
        'id', id, 'sourceKey', source_key, 'name', name,
        'description', description, 'visibility', visibility
      ) ORDER BY name) AS values
    FROM location_rows GROUP BY session_id
  ),
  entity_rows AS (
    SELECT DISTINCT link.session_id, entity.id, entity.source_key, entity.name,
      entity.entity_type, entity.visibility, entity.description, entity.image_url
    FROM campaign_session_entities AS link
    JOIN campaign_entities AS entity ON entity.id = link.entity_id
    JOIN target_campaign AS campaign ON campaign.id = entity.campaign_id
    WHERE $2 = 'editor' OR entity.visibility <> 'dm_only'
  ),
  entities AS (
    SELECT session_id,
      jsonb_agg(jsonb_build_object(
        'id', id, 'sourceKey', source_key, 'name', name,
        'entityType', entity_type, 'visibility', visibility,
        'description', description, 'imageUrl', image_url
      ) ORDER BY name) AS values
    FROM entity_rows GROUP BY session_id
  )
  SELECT campaign.source_key AS "campaignKey",
    COALESCE(jsonb_agg(jsonb_build_object(
      'id', session.id,
      'sessionNumber', session.session_number,
      'isMultiDay', session.is_multi_day,
      'sessionName', session.session_name,
      'visibility', session.visibility,
      'description', session.description,
      'startedOn', session.started_on,
      'endedOn', session.ended_on,
      'createdAt', session.created_at,
      'updatedAt', session.updated_at,
      'locations', COALESCE(locations.values, '[]'::jsonb),
      'entities', COALESCE(entities.values, '[]'::jsonb)
    ) ORDER BY session.session_number) FILTER (WHERE session.id IS NOT NULL), '[]'::jsonb) AS sessions
  FROM target_campaign AS campaign
  LEFT JOIN campaign_sessions AS session
    ON session.campaign_id = campaign.id
    AND ($2 = 'editor' OR session.visibility <> 'dm_only')
  LEFT JOIN locations ON locations.session_id = session.id
  LEFT JOIN entities ON entities.session_id = session.id
  GROUP BY campaign.id, campaign.source_key
`;

export async function findCampaignSessions(campaignKey, role) {
  const result = await pool.query(campaignSessionsQuery, [campaignKey, role]);
  return result.rows[0] ?? null;
}

export async function updateCampaignSession(campaignKey, sessionId, session) {
  const result = await pool.query(
    `UPDATE campaign_sessions AS target
     SET session_number = $3,
         is_multi_day = $4,
         session_name = $5,
         visibility = $6,
         description = $7,
         started_on = $8,
         ended_on = $9,
         updated_at = NOW()
     WHERE target.id = $2
       AND target.campaign_id = (SELECT id FROM campaigns WHERE source_key = $1)
     RETURNING target.id`,
    [
      campaignKey,
      sessionId,
      session.sessionNumber,
      session.isMultiDay,
      session.sessionName,
      session.visibility,
      session.description,
      session.startedOn,
      session.endedOn,
    ],
  );
  if (!result.rowCount) return null;
  const campaign = await findCampaignSessions(campaignKey, 'editor');
  return campaign?.sessions.find((item) => item.id === sessionId) ?? null;
}

export async function deleteCampaignSession(campaignKey, sessionId) {
  const result = await pool.query(
    `DELETE FROM campaign_sessions
     WHERE id = $2
       AND campaign_id = (SELECT id FROM campaigns WHERE source_key = $1)
     RETURNING id`,
    [campaignKey, sessionId],
  );
  return result.rowCount === 1;
}
