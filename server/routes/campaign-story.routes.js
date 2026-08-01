import { Router } from 'express';
import {
  createLoreEntry,
  createPlotPoint,
  deleteStory,
  findLoreEntries,
  findPlotPoints,
  findStoryOptions,
  updateLoreEntry,
  updatePlotPoint,
} from '../repositories/campaign-story.repository.js';
import { isOptionalString, isUniqueArray, isUuid, requireUuidParameter } from '../validation.js';

const visibilities = new Set(['public', 'party', 'dm_only']);
const categories = new Set([
  'character',
  'deity',
  'faction',
  'location',
  'artifact',
  'history',
  'event',
  'culture',
  'magic',
  'other',
]);
const statuses = new Set(['open', 'in_progress', 'resolved', 'abandoned']);
const priorities = new Set(['low', 'normal', 'high', 'critical']);
const relationshipTypes = new Set([
  'introduced',
  'mentioned',
  'advanced',
  'complicated',
  'resolved',
]);
const validEntityLinks = (links) =>
  isUniqueArray(links, 250, (link) => link?.entityId) &&
  links.every(
    (link) =>
      isUuid(link?.entityId) &&
      isOptionalString(link.relationshipLabel, 200) &&
      isOptionalString(link.notes, 2000),
  );
const validBase = (body) =>
  body &&
  typeof body.title === 'string' &&
  body.title.trim() &&
  body.title.length <= 200 &&
  typeof body.summary === 'string' &&
  body.summary.length <= 2000 &&
  visibilities.has(body.visibility) &&
  typeof body.isPinned === 'boolean' &&
  validEntityLinks(body.entityLinks);
const validLore = (body) =>
  validBase(body) &&
  typeof body.content === 'string' &&
  body.content.length <= 50000 &&
  categories.has(body.category);
const validPlot = (body) =>
  validBase(body) &&
  typeof body.description === 'string' &&
  body.description.length <= 50000 &&
  statuses.has(body.status) &&
  priorities.has(body.priority) &&
  isUniqueArray(body.sessionLinks, 250, (link) => link?.sessionId) &&
  body.sessionLinks.every(
    (link) =>
      isUuid(link?.sessionId) &&
      relationshipTypes.has(link.relationshipType) &&
      isOptionalString(link.notes, 2000),
  );
const sourceKey = (title) =>
  title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'entry';
const clean = (body) => ({
  ...body,
  title: body.title.trim(),
  summary: body.summary.trim(),
  sourceKey: sourceKey(body.title),
});

function sendMutationError(error, response, next) {
  if (error.code === '23505')
    return response
      .status(409)
      .json({ message: 'A duplicate relationship or source key was provided.' });
  if (error.code === 'INVALID_RELATIONSHIPS')
    return response.status(400).json({ message: 'A linked session or entity is invalid.' });
  next(error);
}

export function createCampaignStoryRouter({ authenticate, requireEditor }) {
  const router = Router();
  router.get('/:campaignKey/story-options', authenticate, async (request, response, next) => {
    try {
      const value = await findStoryOptions(request.params.campaignKey, request.user.role);
      if (!value) return response.status(404).json({ message: 'Campaign not found.' });
      response.json({ entities: value.entities, sessions: value.sessions });
    } catch (error) {
      next(error);
    }
  });
  router.get('/:campaignKey/lore', authenticate, async (request, response, next) => {
    try {
      const value = await findLoreEntries(request.params.campaignKey, request.user.role);
      if (!value) return response.status(404).json({ message: 'Campaign not found.' });
      response.json(value.entries);
    } catch (error) {
      next(error);
    }
  });
  router.get('/:campaignKey/plot-points', authenticate, async (request, response, next) => {
    try {
      const value = await findPlotPoints(request.params.campaignKey, request.user.role);
      if (!value) return response.status(404).json({ message: 'Campaign not found.' });
      response.json(value.points);
    } catch (error) {
      next(error);
    }
  });
  router.post(
    '/:campaignKey/lore',
    authenticate,
    requireEditor,
    async (request, response, next) => {
      try {
        if (!validLore(request.body))
          return response.status(400).json({ message: 'The lore entry is invalid.' });
        const value = await createLoreEntry(request.params.campaignKey, clean(request.body));
        if (!value) return response.status(404).json({ message: 'Campaign not found.' });
        response.status(201).json(value);
      } catch (error) {
        sendMutationError(error, response, next);
      }
    },
  );
  router.put(
    '/:campaignKey/lore/:id',
    authenticate,
    requireEditor,
    requireUuidParameter('id'),
    async (request, response, next) => {
      try {
        if (!validLore(request.body))
          return response.status(400).json({ message: 'The lore entry is invalid.' });
        const value = await updateLoreEntry(
          request.params.campaignKey,
          request.params.id,
          clean(request.body),
        );
        if (!value) return response.status(404).json({ message: 'Lore entry not found.' });
        response.json(value);
      } catch (error) {
        sendMutationError(error, response, next);
      }
    },
  );
  router.post(
    '/:campaignKey/plot-points',
    authenticate,
    requireEditor,
    async (request, response, next) => {
      try {
        if (!validPlot(request.body))
          return response.status(400).json({ message: 'The plot point is invalid.' });
        const value = await createPlotPoint(request.params.campaignKey, clean(request.body));
        if (!value) return response.status(404).json({ message: 'Campaign not found.' });
        response.status(201).json(value);
      } catch (error) {
        sendMutationError(error, response, next);
      }
    },
  );
  router.put(
    '/:campaignKey/plot-points/:id',
    authenticate,
    requireEditor,
    requireUuidParameter('id'),
    async (request, response, next) => {
      try {
        if (!validPlot(request.body))
          return response.status(400).json({ message: 'The plot point is invalid.' });
        const value = await updatePlotPoint(
          request.params.campaignKey,
          request.params.id,
          clean(request.body),
        );
        if (!value) return response.status(404).json({ message: 'Plot point not found.' });
        response.json(value);
      } catch (error) {
        sendMutationError(error, response, next);
      }
    },
  );
  for (const [path, kind] of [
    ['lore', 'lore'],
    ['plot-points', 'plot'],
  ])
    router.delete(
      `/:campaignKey/${path}/:id`,
      authenticate,
      requireEditor,
      requireUuidParameter('id'),
      async (request, response, next) => {
        try {
          if (request.body?.confirmation !== 'delete')
            return response.status(400).json({ message: 'Delete confirmation is required.' });
          const deleted = await deleteStory(request.params.campaignKey, request.params.id, kind);
          if (!deleted) return response.status(404).json({ message: 'Record not found.' });
          response.status(204).send();
        } catch (error) {
          next(error);
        }
      },
    );
  return router;
}
