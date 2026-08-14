import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import express from 'express';
import { createCampaignEntityRouter } from './campaign-entity.routes.js';

const servers = [];
afterEach(() => servers.splice(0).forEach((server) => server.close()));

async function request({
  role = null,
  findEntities = async () => ({ entities: [] }),
  updateEntity,
  method = 'GET',
  body,
  entityId,
} = {}) {
  const app = express();
  app.use(express.json());
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
      updateEntity,
    }),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once('listening', resolve));
  const suffix = entityId ? `/${entityId}` : '';
  return fetch(
    `http://127.0.0.1:${server.address().port}/api/campaigns/curse-of-strahd/entities${suffix}`,
    {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  );
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

test('passes an updated campaign section to the repository', async () => {
  const entityId = '11111111-1111-4111-8111-111111111111';
  let receivedEntity;
  const body = {
    name: 'Ireena Kolyana',
    entityType: 'npc',
    visibility: 'party',
    imageUrl: null,
    description: '',
    aliases: [],
    sectionEntries: [
      {
        id: '22222222-2222-4222-8222-222222222222',
        sectionId: 'closest-allies',
        details: { type: 'notableEvents', value: 'Joined the party.' },
        status: 'Alive',
        context: null,
      },
    ],
  };
  const response = await request({
    role: 'editor',
    method: 'PUT',
    entityId,
    body,
    updateEntity: async (_campaignKey, _entityId, entity) => {
      receivedEntity = entity;
      return { id: entityId, ...entity };
    },
  });

  assert.equal(response.status, 200);
  assert.equal(receivedEntity.sectionEntries[0].sectionId, 'closest-allies');
});

test('normalizes a write-in campaign section before updating', async () => {
  const entityId = '11111111-1111-4111-8111-111111111111';
  let receivedEntity;
  const response = await request({
    role: 'editor',
    method: 'PUT',
    entityId,
    body: {
      name: 'Ireena Kolyana',
      entityType: 'npc',
      visibility: 'party',
      aliases: [],
      sectionEntries: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          sectionId: '__new__',
          newSectionName: '  Trusted Companions  ',
          details: { type: 'notableEvents', value: 'Joined the party.' },
          status: 'Alive',
          context: null,
        },
      ],
    },
    updateEntity: async (_campaignKey, _entityId, entity) => {
      receivedEntity = entity;
      return { id: entityId, ...entity };
    },
  });

  assert.equal(response.status, 200);
  assert.equal(receivedEntity.sectionEntries[0].sectionId, 'trusted-companions');
  assert.equal(receivedEntity.sectionEntries[0].newSectionName, 'Trusted Companions');
});
