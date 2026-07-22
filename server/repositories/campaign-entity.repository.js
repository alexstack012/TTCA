import { pool } from '../db.js';

const campaignEntitiesQuery = `
  WITH target_campaign AS (
    SELECT id, source_key
    FROM campaigns
    WHERE source_key = $1
  ),
  aliases AS (
    SELECT alias.entity_id, jsonb_agg(alias.alias ORDER BY alias.alias) AS values
    FROM campaign_entity_aliases AS alias
    JOIN campaign_entities AS entity ON entity.id = alias.entity_id
    JOIN target_campaign AS campaign ON campaign.id = entity.campaign_id
    GROUP BY alias.entity_id
  ),
  section_entries AS (
    SELECT
      entry.entity_id,
      jsonb_agg(
        jsonb_build_object(
          'sectionId', section.source_key,
          'id', entry.id,
          'sectionName', section.name,
          'sectionOrder', section.display_order,
          'details', jsonb_build_object(
            'type', entry.details_type,
            'value', entry.details_value
          ),
          'status', entry.status,
          'context', CASE
            WHEN entry.context_type IS NULL THEN NULL
            ELSE jsonb_build_object(
              'type', entry.context_type,
              'value', entry.context_value
            )
          END
        )
        ORDER BY section.display_order, entry.display_order
      ) AS values
    FROM campaign_entity_section_entries AS entry
    JOIN campaign_sections AS section ON section.id = entry.section_id
    JOIN campaign_entities AS entity ON entity.id = entry.entity_id
    JOIN target_campaign AS campaign ON campaign.id = entity.campaign_id
    GROUP BY entry.entity_id
  ),
  entities AS (
    SELECT
      entity.id,
      entity.source_key,
      entity.name,
      entity.entity_type,
      entity.visibility,
      entity.image_url,
      entity.description,
      COALESCE(alias.values, '[]'::jsonb) AS aliases,
      COALESCE(section_entry.values, '[]'::jsonb) AS section_entries
    FROM campaign_entities AS entity
    JOIN target_campaign AS campaign ON campaign.id = entity.campaign_id
    LEFT JOIN aliases AS alias ON alias.entity_id = entity.id
    LEFT JOIN section_entries AS section_entry ON section_entry.entity_id = entity.id
  )
  SELECT
    campaign.source_key AS "campaignKey",
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', entity.id,
          'sourceKey', entity.source_key,
          'name', entity.name,
          'entityType', entity.entity_type,
          'visibility', entity.visibility,
          'imageUrl', entity.image_url,
          'description', entity.description,
          'aliases', entity.aliases,
          'sectionEntries', entity.section_entries
        )
        ORDER BY entity.name
      ) FILTER (WHERE entity.id IS NOT NULL),
      '[]'::jsonb
    ) AS entities
  FROM target_campaign AS campaign
  LEFT JOIN entities AS entity ON TRUE
  GROUP BY campaign.id, campaign.source_key
`;

export async function findCampaignEntities(campaignKey) {
  const result = await pool.query(campaignEntitiesQuery, [campaignKey]);
  return result.rows[0] ?? null;
}

export async function createCampaignEntity(campaignKey, entity) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const target = await client.query(
      `SELECT campaign.id AS campaign_id, section.id AS section_id
       FROM campaigns AS campaign
       LEFT JOIN campaign_sections AS section
         ON section.campaign_id = campaign.id AND section.source_key = $2
       WHERE campaign.source_key = $1`,
      [campaignKey, entity.sectionId],
    );
    if (!target.rows[0]?.campaign_id || !target.rows[0]?.section_id) {
      await client.query('ROLLBACK');
      return null;
    }

    const sourceKeyResult = await client.query(
      `SELECT CASE
         WHEN EXISTS (
           SELECT 1 FROM campaign_entities WHERE campaign_id = $1 AND source_key = $2
         ) THEN $2 || '-' || LEFT(gen_random_uuid()::text, 8)
         ELSE $2
       END AS source_key`,
      [target.rows[0].campaign_id, entity.sourceKey],
    );
    const inserted = await client.query(
      `INSERT INTO campaign_entities (
         campaign_id, source_key, name, entity_type, visibility, image_url, description
       ) VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''))
       RETURNING id`,
      [
        target.rows[0].campaign_id,
        sourceKeyResult.rows[0].source_key,
        entity.name,
        entity.entityType,
        entity.visibility,
        entity.imageUrl ?? '',
        entity.description ?? '',
      ],
    );
    const entityId = inserted.rows[0].id;

    if (entity.aliases.length) {
      await client.query(
        `INSERT INTO campaign_entity_aliases (entity_id, alias)
         SELECT $1, alias FROM unnest($2::text[]) AS alias`,
        [entityId, entity.aliases],
      );
    }
    await client.query(
      `INSERT INTO campaign_entity_section_entries (
         entity_id, section_id, details_type, details_value, status,
         context_type, context_value, display_order
       ) VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''), 0)`,
      [
        entityId,
        target.rows[0].section_id,
        entity.details.type,
        entity.details.value,
        entity.status,
        entity.context?.type ?? '',
        entity.context?.value ?? '',
      ],
    );
    await client.query('COMMIT');
    const campaign = await findCampaignEntities(campaignKey);
    return campaign?.entities.find((item) => item.id === entityId) ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function updateCampaignEntity(campaignKey, entityId, entity) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const updated = await client.query(
      `UPDATE campaign_entities
       SET name = $3,
           entity_type = $4,
           visibility = $5,
           image_url = NULLIF($6, ''),
           description = NULLIF($7, ''),
           updated_at = NOW()
       WHERE id = $2
         AND campaign_id = (SELECT id FROM campaigns WHERE source_key = $1)
       RETURNING id`,
      [
        campaignKey,
        entityId,
        entity.name,
        entity.entityType,
        entity.visibility,
        entity.imageUrl ?? '',
        entity.description ?? '',
      ],
    );
    if (!updated.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }

    await client.query('DELETE FROM campaign_entity_aliases WHERE entity_id = $1', [entityId]);
    if (entity.aliases.length) {
      await client.query(
        `INSERT INTO campaign_entity_aliases (entity_id, alias)
         SELECT $1, alias
         FROM unnest($2::text[]) AS alias`,
        [entityId, entity.aliases],
      );
    }

    if (entity.sectionEntries.length) {
      await client.query(
        `UPDATE campaign_entity_section_entries AS entry
         SET details_type = value.details_type,
             details_value = value.details_value,
             status = value.status,
             context_type = NULLIF(value.context_type, ''),
             context_value = NULLIF(value.context_value, '')
         FROM jsonb_to_recordset($2::jsonb) AS value(
           id uuid,
           details_type text,
           details_value text,
           status text,
           context_type text,
           context_value text
         )
         WHERE entry.id = value.id AND entry.entity_id = $1`,
        [
          entityId,
          JSON.stringify(
            entity.sectionEntries.map((entry) => ({
              id: entry.id,
              details_type: entry.details.type,
              details_value: entry.details.value,
              status: entry.status,
              context_type: entry.context?.type ?? '',
              context_value: entry.context?.value ?? '',
            })),
          ),
        ],
      );
    }

    await client.query('COMMIT');
    const campaign = await findCampaignEntities(campaignKey);
    return campaign?.entities.find((item) => item.id === entityId) ?? null;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteCampaignEntity(campaignKey, entityId) {
  const result = await pool.query(
    `DELETE FROM campaign_entities
     WHERE id = $2
       AND campaign_id = (SELECT id FROM campaigns WHERE source_key = $1)
     RETURNING id`,
    [campaignKey, entityId],
  );
  return result.rowCount === 1;
}
