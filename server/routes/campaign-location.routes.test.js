import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import express from 'express';
import { createCampaignLocationRouter } from './campaign-location.routes.js';

const servers = [];
afterEach(() => servers.splice(0).forEach((server) => server.close()));

async function request(options = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/campaigns',
    createCampaignLocationRouter({
      authenticate: (request, _response, next) => {
        request.user = { role: 'editor' };
        next();
      },
      requireEditor: (_request, _response, next) => next(),
      findLocations: async () => ({ locations: [] }),
      ...options.dependencies,
    }),
  );
  app.use((error, _request, response, _next) =>
    response.status(500).json({ message: error.message }),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once('listening', resolve));
  return fetch(
    `http://127.0.0.1:${server.address().port}/api/campaigns/curse-of-strahd/locations${options.path ?? ''}`,
    {
      method: options.method ?? 'GET',
      headers: options.body ? { 'content-type': 'application/json' } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
    },
  );
}

const location = {
  id: '00000000-0000-4000-8000-000000000001',
  sourceKey: 'barovia',
  name: 'Barovia',
  description: 'A land surrounded by the Mists.',
  imageUrl: null,
  visibility: 'party',
  sessions: [],
};
const input = {
  name: 'Barovia',
  description: 'A land surrounded by the Mists.',
  imageUrl: null,
  visibility: 'party',
};

test('returns 404 for a missing campaign', async () => {
  const response = await request({ dependencies: { findLocations: async () => null } });
  assert.equal(response.status, 404);
});

test('returns campaign locations', async () => {
  const response = await request({
    dependencies: { findLocations: async () => ({ locations: [location] }) },
  });
  assert.deepEqual(await response.json(), [location]);
});

test('creates a valid location', async () => {
  const response = await request({
    method: 'POST',
    body: input,
    dependencies: { createLocation: async () => location },
  });
  assert.equal(response.status, 201);
});

test('updates a valid location', async () => {
  const response = await request({
    method: 'PUT',
    path: `/${location.id}`,
    body: input,
    dependencies: { updateLocation: async () => location },
  });
  assert.equal(response.status, 200);
});

test('requires typed confirmation before deletion', async () => {
  const response = await request({
    method: 'DELETE',
    path: `/${location.id}`,
    body: {},
    dependencies: { deleteLocation: async () => true },
  });
  assert.equal(response.status, 400);
});

test('deletes a confirmed location', async () => {
  const response = await request({
    method: 'DELETE',
    path: `/${location.id}`,
    body: { confirmation: 'delete' },
    dependencies: { deleteLocation: async () => true },
  });
  assert.equal(response.status, 204);
});
