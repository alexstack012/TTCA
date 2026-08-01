import { Router } from 'express';
import {
  createCampaignSession,
  deleteCampaignSession,
  findCampaignSessionOptions,
  findCampaignSessions,
  updateCampaignSession,
} from '../repositories/campaign-session.repository.js';

function uniqueById(values) {
  return [
    ...new Map((Array.isArray(values) ? values : []).map((value) => [value.id, value])).values(),
  ];
}

function normalizeSessions(sessions) {
  return (Array.isArray(sessions) ? sessions : [])
    .map((session) => ({
      ...session,
      sessionNumber: Number(session.sessionNumber),
      isMultiDay: Boolean(session.isMultiDay),
      locations: uniqueById(session.locations),
      entities: uniqueById(session.entities),
    }))
    .sort((left, right) => left.sessionNumber - right.sessionNumber);
}

const visibilities = new Set(['public', 'party', 'dm_only']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validSession(body) {
  return (
    body &&
    Number.isInteger(body.sessionNumber) &&
    body.sessionNumber > 0 &&
    typeof body.isMultiDay === 'boolean' &&
    typeof body.sessionName === 'string' &&
    body.sessionName.trim().length > 0 &&
    body.sessionName.length <= 200 &&
    visibilities.has(body.visibility) &&
    typeof body.description === 'string' &&
    body.description.length <= 20000 &&
    (body.startedOn == null || datePattern.test(body.startedOn)) &&
    (body.endedOn == null || datePattern.test(body.endedOn)) &&
    (!body.startedOn || !body.endedOn || body.endedOn >= body.startedOn) &&
    Array.isArray(body.locationIds) &&
    body.locationIds.every((id) => typeof id === 'string' && uuidPattern.test(id)) &&
    Array.isArray(body.entityIds) &&
    body.entityIds.every((id) => typeof id === 'string' && uuidPattern.test(id))
  );
}

function mutationError(error, response, next) {
  if (error.code === '23505')
    return response.status(409).json({ message: 'That session number is already in use.' });
  if (error.code === 'INVALID_RELATIONSHIPS')
    return response.status(400).json({ message: 'A linked location or entity is invalid.' });
  next(error);
}

export function createCampaignSessionRouter({
  authenticate,
  requireEditor,
  findSessions = findCampaignSessions,
  findOptions = findCampaignSessionOptions,
  createSession = createCampaignSession,
  updateSession = updateCampaignSession,
  deleteSession = deleteCampaignSession,
}) {
  const router = Router();

  router.get('/:campaignKey/sessions', authenticate, async (request, response, next) => {
    try {
      const campaign = await findSessions(request.params.campaignKey, request.user.role);
      if (!campaign) return response.status(404).json({ message: 'Campaign not found.' });
      response.json(normalizeSessions(campaign.sessions));
    } catch (error) {
      next(error);
    }
  });

  router.get('/:campaignKey/session-options', authenticate, async (request, response, next) => {
    try {
      const options = await findOptions(request.params.campaignKey, request.user.role);
      if (!options) return response.status(404).json({ message: 'Campaign not found.' });
      response.json({ locations: options.locations, entities: options.entities });
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/:campaignKey/sessions',
    authenticate,
    requireEditor,
    async (request, response, next) => {
      try {
        if (!validSession(request.body))
          return response.status(400).json({ message: 'The campaign session is invalid.' });
        const session = await createSession(request.params.campaignKey, {
          ...request.body,
          sessionName: request.body.sessionName.trim(),
        });
        if (!session) return response.status(404).json({ message: 'Campaign not found.' });
        response.status(201).json(normalizeSessions([session])[0]);
      } catch (error) {
        mutationError(error, response, next);
      }
    },
  );

  router.put(
    '/:campaignKey/sessions/:sessionId',
    authenticate,
    requireEditor,
    async (request, response, next) => {
      try {
        if (!validSession(request.body))
          return response.status(400).json({ message: 'The campaign session is invalid.' });
        const session = await updateSession(request.params.campaignKey, request.params.sessionId, {
          ...request.body,
          sessionName: request.body.sessionName.trim(),
        });
        if (!session) return response.status(404).json({ message: 'Campaign session not found.' });
        response.json(normalizeSessions([session])[0]);
      } catch (error) {
        mutationError(error, response, next);
      }
    },
  );

  router.delete(
    '/:campaignKey/sessions/:sessionId',
    authenticate,
    requireEditor,
    async (request, response, next) => {
      try {
        if (request.body?.confirmation !== 'delete')
          return response.status(400).json({ message: 'Delete confirmation is required.' });
        const deleted = await deleteSession(request.params.campaignKey, request.params.sessionId);
        if (!deleted) return response.status(404).json({ message: 'Campaign session not found.' });
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
