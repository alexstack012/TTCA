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

export async function findCampaignSessionOptions(campaignKey, role) {
  const result = await pool.query(
    `SELECT
       campaign.id AS "campaignId",
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'id', location.id,
           'sourceKey', location.source_key,
           'name', location.name,
           'description', location.description,
           'visibility', location.visibility
         ) ORDER BY location.name)
         FROM campaign_locations AS location
         WHERE location.campaign_id = campaign.id
           AND ($2 = 'editor' OR location.visibility <> 'dm_only')
       ), '[]'::jsonb) AS locations,
       COALESCE((
         SELECT jsonb_agg(jsonb_build_object(
           'id', entity.id,
           'sourceKey', entity.source_key,
           'name', entity.name,
           'entityType', entity.entity_type,
           'visibility', entity.visibility,
           'description', entity.description,
           'imageUrl', entity.image_url
         ) ORDER BY entity.name)
         FROM campaign_entities AS entity
         WHERE entity.campaign_id = campaign.id
           AND ($2 = 'editor' OR entity.visibility <> 'dm_only')
       ), '[]'::jsonb) AS entities
     FROM campaigns AS campaign
     WHERE campaign.source_key = $1`,
    [campaignKey, role],
  );
  return result.rows[0] ?? null;
}

async function replaceSessionRelationships(client, sessionId, campaignId, session) {
  await client.query('DELETE FROM campaign_session_locations WHERE session_id = $1', [sessionId]);
  await client.query('DELETE FROM campaign_session_entities WHERE session_id = $1', [sessionId]);

  const locationIds = [...new Set(session.locationIds)];
  const entityIds = [...new Set(session.entityIds)];
  if (locationIds.length) {
    const locations = await client.query(
      `INSERT INTO campaign_session_locations (session_id, location_id)
       SELECT $1, location.id
       FROM campaign_locations AS location
       WHERE location.campaign_id = $2 AND location.id = ANY($3::uuid[])
       RETURNING location_id`,
      [sessionId, campaignId, locationIds],
    );
    if (locations.rowCount !== locationIds.length)
      throw Object.assign(new Error(), { code: 'INVALID_RELATIONSHIPS' });
  }
  if (entityIds.length) {
    const entities = await client.query(
      `INSERT INTO campaign_session_entities (session_id, entity_id)
       SELECT $1, entity.id
       FROM campaign_entities AS entity
       WHERE entity.campaign_id = $2 AND entity.id = ANY($3::uuid[])
       RETURNING entity_id`,
      [sessionId, campaignId, entityIds],
    );
    if (entities.rowCount !== entityIds.length)
      throw Object.assign(new Error(), { code: 'INVALID_RELATIONSHIPS' });
  }
}

export async function createCampaignSession(campaignKey, session) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inserted = await client.query(
      `INSERT INTO campaign_sessions (
         campaign_id, session_number, is_multi_day, session_name, visibility,
         description, started_on, ended_on
       )
       SELECT id, $2, $3, $4, $5, $6, $7, $8
       FROM campaigns WHERE source_key = $1
       RETURNING id, campaign_id`,
      [
        campaignKey,
        session.sessionNumber,
        session.isMultiDay,
        session.sessionName,
        session.visibility,
        session.description,
        session.startedOn,
        session.endedOn,
      ],
    );
    if (!inserted.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }
    const { id, campaign_id: campaignId } = inserted.rows[0];
    await replaceSessionRelationships(client, id, campaignId, session);
    await client.query('COMMIT');
    const campaign = await findCampaignSessions(campaignKey, 'editor');
    return campaign?.sessions.find((item) => item.id === id) ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCampaignSession(campaignKey, sessionId, session) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
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
     RETURNING target.id, target.campaign_id`,
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
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }
    await replaceSessionRelationships(client, sessionId, result.rows[0].campaign_id, session);
    await client.query('COMMIT');
    const campaign = await findCampaignSessions(campaignKey, 'editor');
    return campaign?.sessions.find((item) => item.id === sessionId) ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
