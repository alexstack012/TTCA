import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import express from 'express';
import { createCampaignEntityRouter } from './campaign-entity.routes.js';

const servers = [];
afterEach(() => servers.splice(0).forEach((server) => server.close()));

async function request({ role = null, findEntities = async () => ({ entities: [] }) } = {}) {
  const app = express();
  app.use(
    '/api/campaigns',
    createCampaignEntityRouter({
      authenticate: (request, response, next) => {
        if (!role) return response.status(401).json({ message: 'Authentication required.' });
        request.user = { role };
        next();
      },
      requireEditor: (_request, _response, next) => next(),
      findEntities,
    }),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once('listening', resolve));
  return fetch(`http://127.0.0.1:${server.address().port}/api/campaigns/curse-of-strahd/entities`);
}

test('requires authentication to read campaign entities', async () => {
  assert.equal((await request()).status, 401);
});

test('passes the authenticated demo role to server-side filtering', async () => {
  let receivedRole;
  const response = await request({
    role: 'demo',
    findEntities: async (_campaignKey, role) => {
      receivedRole = role;
      return { entities: [{ id: 'public-entity', visibility: 'public' }] };
    },
  });
  assert.equal(response.status, 200);
  assert.equal(receivedRole, 'demo');
  assert.deepEqual(await response.json(), [{ id: 'public-entity', visibility: 'public' }]);
});

test('passes the editor role to the repository', async () => {
  let receivedRole;
  const response = await request({
    role: 'editor',
    findEntities: async (_campaignKey, role) => {
      receivedRole = role;
      return { entities: [] };
    },
  });
  assert.equal(response.status, 200);
  assert.equal(receivedRole, 'editor');
});
