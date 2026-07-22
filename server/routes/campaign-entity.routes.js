import { Router } from 'express';
import {
  createCampaignEntity,
  deleteCampaignEntity,
  findCampaignEntities,
  updateCampaignEntity,
} from '../repositories/campaign-entity.repository.js';

const entityTypes = new Set([
  'npc',
  'creature',
  'deity',
  'artifact',
  'group',
  'supernatural_entity',
]);
const visibilities = new Set(['public', 'party', 'dm_only']);
const detailsTypes = new Set(['notableEvents', 'notableInformation', 'relevance']);
const contextTypes = new Set(['firstMeeting', 'firstAppearance', 'connection']);

function validProfile(body) {
  return (
    body &&
    typeof body.name === 'string' &&
    body.name.trim().length > 0 &&
    body.name.length <= 200 &&
    entityTypes.has(body.entityType) &&
    visibilities.has(body.visibility) &&
    Array.isArray(body.aliases) &&
    body.aliases.every((alias) => typeof alias === 'string' && alias.length <= 200) &&
    (body.imageUrl == null ||
      (typeof body.imageUrl === 'string' && body.imageUrl.length <= 2048)) &&
    (body.description == null ||
      (typeof body.description === 'string' && body.description.length <= 5000))
  );
}

function validContext(context) {
  return (
    !context ||
    (contextTypes.has(context.type) &&
      typeof context.value === 'string' &&
      context.value.trim().length > 0)
  );
}

function validUpdate(body) {
  return (
    validProfile(body) &&
    Array.isArray(body.sectionEntries) &&
    body.sectionEntries.every(
      (entry) =>
        typeof entry.id === 'string' &&
        detailsTypes.has(entry.details?.type) &&
        typeof entry.details?.value === 'string' &&
        typeof entry.status === 'string' &&
        validContext(entry.context),
    )
  );
}

function validCreate(body) {
  return (
    validProfile(body) &&
    typeof body.sectionId === 'string' &&
    detailsTypes.has(body.details?.type) &&
    typeof body.details?.value === 'string' &&
    body.details.value.trim().length > 0 &&
    typeof body.status === 'string' &&
    body.status.trim().length > 0 &&
    validContext(body.context)
  );
}

function sourceKey(name) {
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'character'
  );
}

function aliases(values) {
  return [...new Set(values.map((alias) => alias.trim()).filter(Boolean))];
}

export function createCampaignEntityRouter({ authenticate, requireEditor }) {
  const router = Router();
  router.get('/:campaignKey/entities', async (request, response, next) => {
    try {
      const campaign = await findCampaignEntities(request.params.campaignKey);
      if (!campaign) return response.status(404).json({ message: 'Campaign not found.' });
      response.json(campaign.entities);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/:campaignKey/entities',
    authenticate,
    requireEditor,
    async (request, response, next) => {
      try {
        if (!validCreate(request.body))
          return response.status(400).json({ message: 'The new character record is invalid.' });
        const entity = await createCampaignEntity(request.params.campaignKey, {
          ...request.body,
          sourceKey: sourceKey(request.body.name),
          name: request.body.name.trim(),
          status: request.body.status.trim(),
          details: { ...request.body.details, value: request.body.details.value.trim() },
          aliases: aliases(request.body.aliases),
        });
        if (!entity) return response.status(404).json({ message: 'Campaign section not found.' });
        response.status(201).json(entity);
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    '/:campaignKey/entities/:entityId',
    authenticate,
    requireEditor,
    async (request, response, next) => {
      try {
        if (!validUpdate(request.body))
          return response.status(400).json({ message: 'The character update is invalid.' });
        const entity = await updateCampaignEntity(
          request.params.campaignKey,
          request.params.entityId,
          {
            ...request.body,
            name: request.body.name.trim(),
            aliases: aliases(request.body.aliases),
          },
        );
        if (!entity) return response.status(404).json({ message: 'Character not found.' });
        response.json(entity);
      } catch (error) {
        next(error);
      }
    },
  );
  router.delete(
    '/:campaignKey/entities/:entityId',
    authenticate,
    requireEditor,
    async (request, response, next) => {
      try {
        if (request.body?.confirmation !== 'delete') {
          return response.status(400).json({ message: 'Delete confirmation is required.' });
        }
        const deleted = await deleteCampaignEntity(
          request.params.campaignKey,
          request.params.entityId,
        );
        if (!deleted) return response.status(404).json({ message: 'Character not found.' });
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
