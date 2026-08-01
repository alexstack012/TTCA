import { pool } from '../db.js';

export async function findLoreEntries(campaignKey, role) {
  const result = await pool.query(
    `SELECT campaign.source_key AS "campaignKey",
       COALESCE(jsonb_agg(jsonb_build_object(
         'id', lore.id, 'sourceKey', lore.source_key, 'title', lore.title,
         'summary', lore.summary, 'content', lore.content, 'category', lore.category,
         'visibility', lore.visibility, 'isPinned', lore.is_pinned,
         'createdAt', lore.created_at, 'updatedAt', lore.updated_at,
         'entities', COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'id', entity.id, 'sourceKey', entity.source_key, 'name', entity.name,
           'entityType', entity.entity_type, 'imageUrl', entity.image_url,
           'relationshipLabel', link.relationship_label, 'notes', link.notes
         ) ORDER BY entity.name)
         FROM campaign_lore_entry_entities AS link
         JOIN campaign_entities AS entity ON entity.id = link.entity_id
         WHERE link.lore_entry_id = lore.id
           AND ($2 = 'editor' OR entity.visibility <> 'dm_only')), '[]'::jsonb)
       ) ORDER BY lore.is_pinned DESC, lore.title)
       FILTER (WHERE lore.id IS NOT NULL), '[]'::jsonb) AS entries
     FROM campaigns AS campaign
     LEFT JOIN campaign_lore_entries AS lore
       ON lore.campaign_id = campaign.id AND ($2 = 'editor' OR lore.visibility <> 'dm_only')
     WHERE campaign.source_key = $1
     GROUP BY campaign.id, campaign.source_key`,
    [campaignKey, role],
  );
  return result.rows[0] ?? null;
}

export async function findPlotPoints(campaignKey, role) {
  const result = await pool.query(
    `SELECT campaign.source_key AS "campaignKey",
       COALESCE(jsonb_agg(jsonb_build_object(
         'id', point.id, 'sourceKey', point.source_key, 'title', point.title,
         'summary', point.summary, 'description', point.description, 'status', point.status,
         'priority', point.priority, 'visibility', point.visibility, 'isPinned', point.is_pinned,
         'createdAt', point.created_at, 'updatedAt', point.updated_at,
         'entities', COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'id', entity.id, 'sourceKey', entity.source_key, 'name', entity.name,
           'entityType', entity.entity_type, 'imageUrl', entity.image_url,
           'relationshipLabel', link.relationship_label, 'notes', link.notes
         ) ORDER BY entity.name)
         FROM campaign_plot_point_entities AS link
         JOIN campaign_entities AS entity ON entity.id = link.entity_id
         WHERE link.plot_point_id = point.id
           AND ($2 = 'editor' OR entity.visibility <> 'dm_only')), '[]'::jsonb),
         'sessions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
           'id', session.id, 'sessionNumber', session.session_number,
           'sessionName', session.session_name, 'relationshipType', link.relationship_type,
           'notes', link.notes
         ) ORDER BY session.session_number)
         FROM campaign_plot_point_sessions AS link
         JOIN campaign_sessions AS session ON session.id = link.session_id
         WHERE link.plot_point_id = point.id
           AND ($2 = 'editor' OR session.visibility <> 'dm_only')), '[]'::jsonb)
       ) ORDER BY point.is_pinned DESC, point.title)
       FILTER (WHERE point.id IS NOT NULL), '[]'::jsonb) AS points
     FROM campaigns AS campaign
     LEFT JOIN campaign_plot_points AS point
       ON point.campaign_id = campaign.id AND ($2 = 'editor' OR point.visibility <> 'dm_only')
     WHERE campaign.source_key = $1
     GROUP BY campaign.id, campaign.source_key`,
    [campaignKey, role],
  );
  return result.rows[0] ?? null;
}

export async function findStoryOptions(campaignKey, role) {
  const result = await pool.query(
    `SELECT campaign.id AS "campaignId",
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'id', entity.id, 'name', entity.name, 'entityType', entity.entity_type
       ) ORDER BY entity.name) FROM campaign_entities AS entity
       WHERE entity.campaign_id = campaign.id AND ($2 = 'editor' OR entity.visibility <> 'dm_only')), '[]'::jsonb) AS entities,
       COALESCE((SELECT jsonb_agg(jsonb_build_object(
         'id', session.id, 'sessionNumber', session.session_number, 'sessionName', session.session_name
       ) ORDER BY session.session_number) FROM campaign_sessions AS session
       WHERE session.campaign_id = campaign.id AND ($2 = 'editor' OR session.visibility <> 'dm_only')), '[]'::jsonb) AS sessions
     FROM campaigns AS campaign WHERE campaign.source_key = $1`,
    [campaignKey, role],
  );
  return result.rows[0] ?? null;
}

async function replaceEntityLinks(client, table, ownerColumn, ownerId, campaignId, links) {
  await client.query(`DELETE FROM ${table} WHERE ${ownerColumn} = $1`, [ownerId]);
  if (!links.length) return;
  const result = await client.query(
    `INSERT INTO ${table} (${ownerColumn}, entity_id, relationship_label, notes)
     SELECT $1, entity.id, link.relationship_label, link.notes
     FROM jsonb_to_recordset($3::jsonb) AS link(entity_id uuid, relationship_label text, notes text)
     JOIN campaign_entities AS entity ON entity.id = link.entity_id AND entity.campaign_id = $2
     RETURNING entity_id`,
    [
      ownerId,
      campaignId,
      JSON.stringify(
        links.map((link) => ({
          entity_id: link.entityId,
          relationship_label: link.relationshipLabel || null,
          notes: link.notes || null,
        })),
      ),
    ],
  );
  if (result.rowCount !== links.length)
    throw Object.assign(new Error(), { code: 'INVALID_RELATIONSHIPS' });
}

async function replaceSessionLinks(client, pointId, campaignId, links) {
  await client.query('DELETE FROM campaign_plot_point_sessions WHERE plot_point_id = $1', [
    pointId,
  ]);
  if (!links.length) return;
  const result = await client.query(
    `INSERT INTO campaign_plot_point_sessions (plot_point_id, session_id, relationship_type, notes)
     SELECT $1, session.id, link.relationship_type, link.notes
     FROM jsonb_to_recordset($3::jsonb) AS link(session_id uuid, relationship_type text, notes text)
     JOIN campaign_sessions AS session ON session.id = link.session_id AND session.campaign_id = $2
     RETURNING session_id`,
    [
      pointId,
      campaignId,
      JSON.stringify(
        links.map((link) => ({
          session_id: link.sessionId,
          relationship_type: link.relationshipType,
          notes: link.notes || null,
        })),
      ),
    ],
  );
  if (result.rowCount !== links.length)
    throw Object.assign(new Error(), { code: 'INVALID_RELATIONSHIPS' });
}

async function mutateStory({ campaignKey, id, record, kind }) {
  const client = await pool.connect();
  const isLore = kind === 'lore';
  try {
    await client.query('BEGIN');
    const values = isLore
      ? [
          record.sourceKey,
          record.title,
          record.summary,
          record.content,
          record.category,
          record.visibility,
          record.isPinned,
        ]
      : [
          record.sourceKey,
          record.title,
          record.summary,
          record.description,
          record.status,
          record.priority,
          record.visibility,
          record.isPinned,
        ];
    const result = id
      ? await client.query(
          isLore
            ? `UPDATE campaign_lore_entries SET title=$3, summary=NULLIF($4,''), content=$5, category=$6, visibility=$7, is_pinned=$8, updated_at=NOW() WHERE id=$2 AND campaign_id=(SELECT id FROM campaigns WHERE source_key=$1) RETURNING id,campaign_id`
            : `UPDATE campaign_plot_points SET title=$3, summary=NULLIF($4,''), description=$5, status=$6, priority=$7, visibility=$8, is_pinned=$9, updated_at=NOW() WHERE id=$2 AND campaign_id=(SELECT id FROM campaigns WHERE source_key=$1) RETURNING id,campaign_id`,
          [campaignKey, id, ...values.slice(1)],
        )
      : await client.query(
          isLore
            ? `INSERT INTO campaign_lore_entries(campaign_id,source_key,title,summary,content,category,visibility,is_pinned) SELECT id,$2,$3,NULLIF($4,''),$5,$6,$7,$8 FROM campaigns WHERE source_key=$1 RETURNING id,campaign_id`
            : `INSERT INTO campaign_plot_points(campaign_id,source_key,title,summary,description,status,priority,visibility,is_pinned) SELECT id,$2,$3,NULLIF($4,''),$5,$6,$7,$8,$9 FROM campaigns WHERE source_key=$1 RETURNING id,campaign_id`,
          [campaignKey, ...values],
        );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      return null;
    }
    const storyId = result.rows[0].id;
    await replaceEntityLinks(
      client,
      isLore ? 'campaign_lore_entry_entities' : 'campaign_plot_point_entities',
      isLore ? 'lore_entry_id' : 'plot_point_id',
      storyId,
      result.rows[0].campaign_id,
      record.entityLinks,
    );
    if (!isLore)
      await replaceSessionLinks(client, storyId, result.rows[0].campaign_id, record.sessionLinks);
    await client.query('COMMIT');
    const collection = isLore
      ? await findLoreEntries(campaignKey, 'editor')
      : await findPlotPoints(campaignKey, 'editor');
    return (
      (isLore ? collection?.entries : collection?.points)?.find((item) => item.id === storyId) ??
      null
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const createLoreEntry = (campaignKey, record) =>
  mutateStory({ campaignKey, record, kind: 'lore' });
export const updateLoreEntry = (campaignKey, id, record) =>
  mutateStory({ campaignKey, id, record, kind: 'lore' });
export const createPlotPoint = (campaignKey, record) =>
  mutateStory({ campaignKey, record, kind: 'plot' });
export const updatePlotPoint = (campaignKey, id, record) =>
  mutateStory({ campaignKey, id, record, kind: 'plot' });

export async function deleteStory(campaignKey, id, kind) {
  const table = kind === 'lore' ? 'campaign_lore_entries' : 'campaign_plot_points';
  const result = await pool.query(
    `DELETE FROM ${table} WHERE id=$2 AND campaign_id=(SELECT id FROM campaigns WHERE source_key=$1) RETURNING id`,
    [campaignKey, id],
  );
  return result.rowCount === 1;
}
