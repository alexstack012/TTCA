import { Router } from 'express';
import {
  createCampaignEntity,
  deleteCampaignEntity,
  findCampaignEntities,
  updateCampaignEntity,
} from '../repositories/campaign-entity.repository.js';
import { isOptionalString, isUniqueArray, isUuid, requireUuidParameter } from '../validation.js';

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
    isUniqueArray(body.aliases, 50, (alias) =>
      typeof alias === 'string' ? alias.trim().toLowerCase() : alias,
    ) &&
    body.aliases.every((alias) => typeof alias === 'string' && alias.length <= 200) &&
    (body.imageUrl == null ||
      (typeof body.imageUrl === 'string' && body.imageUrl.length <= 2048)) &&
    isOptionalString(body.description, 5000)
  );
}

function validContext(context) {
  return (
    !context ||
    (contextTypes.has(context.type) &&
      typeof context.value === 'string' &&
      context.value.trim().length > 0 &&
      context.value.length <= 2000)
  );
}

function validUpdate(body) {
  return (
    validProfile(body) &&
    isUniqueArray(body.sectionEntries, 25, (entry) => entry?.id) &&
    body.sectionEntries.every(
      (entry) =>
        isUuid(entry?.id) &&
        detailsTypes.has(entry.details?.type) &&
        typeof entry.details?.value === 'string' &&
        entry.details.value.length <= 20000 &&
        typeof entry.status === 'string' &&
        entry.status.trim().length > 0 &&
        entry.status.length <= 200 &&
        validContext(entry.context),
    )
  );
}

function validCreate(body) {
  return (
    validProfile(body) &&
    typeof body.sectionId === 'string' &&
    body.sectionId.length <= 200 &&
    detailsTypes.has(body.details?.type) &&
    typeof body.details?.value === 'string' &&
    body.details.value.trim().length > 0 &&
    body.details.value.length <= 20000 &&
    typeof body.status === 'string' &&
    body.status.trim().length > 0 &&
    body.status.length <= 200 &&
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

export function createCampaignEntityRouter({
  authenticate,
  requireEditor,
  findEntities = findCampaignEntities,
  createEntity = createCampaignEntity,
  updateEntity = updateCampaignEntity,
  deleteEntity = deleteCampaignEntity,
}) {
  const router = Router();
  router.get('/:campaignKey/entities', authenticate, async (request, response, next) => {
    try {
      const campaign = await findEntities(request.params.campaignKey, request.user.role);
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
        const entity = await createEntity(request.params.campaignKey, {
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
    requireUuidParameter('entityId'),
    async (request, response, next) => {
      try {
        if (!validUpdate(request.body))
          return response.status(400).json({ message: 'The character update is invalid.' });
        const entity = await updateEntity(request.params.campaignKey, request.params.entityId, {
          ...request.body,
          name: request.body.name.trim(),
          aliases: aliases(request.body.aliases),
        });
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
    requireUuidParameter('entityId'),
    async (request, response, next) => {
      try {
        if (request.body?.confirmation !== 'delete') {
          return response.status(400).json({ message: 'Delete confirmation is required.' });
        }
        const deleted = await deleteEntity(request.params.campaignKey, request.params.entityId);
        if (!deleted) return response.status(404).json({ message: 'Character not found.' });
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );
  return router;
}
