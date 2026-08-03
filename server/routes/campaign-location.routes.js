import { Router } from 'express';
import {
  createCampaignLocation,
  deleteCampaignLocation,
  findCampaignLocations,
  updateCampaignLocation,
} from '../repositories/campaign-location.repository.js';
import { requireUuidParameter } from '../validation.js';

const visibilities = new Set(['public', 'party', 'dm_only']);

function validLocation(body) {
  return (
    body &&
    typeof body.name === 'string' &&
    body.name.trim().length > 0 &&
    body.name.length <= 200 &&
    (body.description == null ||
      (typeof body.description === 'string' && body.description.length <= 10000)) &&
    (body.imageUrl == null ||
      (typeof body.imageUrl === 'string' && body.imageUrl.length <= 2048)) &&
    visibilities.has(body.visibility)
  );
}

function sourceKey(name) {
  return (
    name
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'location'
  );
}

export function createCampaignLocationRouter({
  authenticate,
  requireEditor,
  findLocations = findCampaignLocations,
  createLocation = createCampaignLocation,
  updateLocation = updateCampaignLocation,
  deleteLocation = deleteCampaignLocation,
}) {
  const router = Router();

  router.get('/:campaignKey/locations', authenticate, async (request, response, next) => {
    try {
      const campaign = await findLocations(request.params.campaignKey, request.user.role);
      if (!campaign) return response.status(404).json({ message: 'Campaign not found.' });
      response.json(campaign.locations);
    } catch (error) {
      next(error);
    }
  });

  router.post(
    '/:campaignKey/locations',
    authenticate,
    requireEditor,
    async (request, response, next) => {
      try {
        if (!validLocation(request.body))
          return response.status(400).json({ message: 'The new location is invalid.' });
        const location = await createLocation(request.params.campaignKey, {
          ...request.body,
          sourceKey: sourceKey(request.body.name),
          name: request.body.name.trim(),
          description: request.body.description?.trim() ?? '',
          imageUrl: request.body.imageUrl?.trim() ?? '',
        });
        if (!location) return response.status(404).json({ message: 'Campaign not found.' });
        response.status(201).json(location);
      } catch (error) {
        next(error);
      }
    },
  );

  router.put(
    '/:campaignKey/locations/:locationId',
    authenticate,
    requireEditor,
    requireUuidParameter('locationId'),
    async (request, response, next) => {
      try {
        if (!validLocation(request.body))
          return response.status(400).json({ message: 'The location record is invalid.' });
        const location = await updateLocation(
          request.params.campaignKey,
          request.params.locationId,
          {
            ...request.body,
            name: request.body.name.trim(),
            description: request.body.description?.trim() ?? '',
            imageUrl: request.body.imageUrl?.trim() ?? '',
          },
        );
        if (!location) return response.status(404).json({ message: 'Location not found.' });
        response.json(location);
      } catch (error) {
        next(error);
      }
    },
  );

  router.delete(
    '/:campaignKey/locations/:locationId',
    authenticate,
    requireEditor,
    requireUuidParameter('locationId'),
    async (request, response, next) => {
      try {
        if (request.body?.confirmation !== 'delete')
          return response.status(400).json({ message: 'Delete confirmation is required.' });
        const deleted = await deleteLocation(request.params.campaignKey, request.params.locationId);
        if (!deleted) return response.status(404).json({ message: 'Location not found.' });
        response.status(204).send();
      } catch (error) {
        next(error);
      }
    },
  );

  return router;
}
