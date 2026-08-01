import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import express from 'express';
import { createCampaignSessionRouter } from './campaign-session.routes.js';

const servers = [];
afterEach(() => servers.splice(0).forEach((server) => server.close()));

async function requestWith(findSessions, request = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/campaigns',
    createCampaignSessionRouter({
      authenticate: (request, _response, next) => {
        request.user = { role: 'editor' };
        next();
      },
      requireEditor: (_request, _response, next) => next(),
      findSessions,
      ...request.dependencies,
    }),
  );
  app.use((error, _request, response, _next) =>
    response.status(500).json({ message: 'handled', cause: error.message }),
  );
  const server = app.listen(0);
  servers.push(server);
  await new Promise((resolve) => server.once('listening', resolve));
  return fetch(
    `http://127.0.0.1:${server.address().port}/api/campaigns/curse-of-strahd/sessions${request.path ?? ''}`,
    {
      method: request.method ?? 'GET',
      headers: request.body ? { 'content-type': 'application/json' } : undefined,
      body: request.body ? JSON.stringify(request.body) : undefined,
    },
  );
}

const relation = { id: 'related-1', name: 'Related record' };
const session = (sessionNumber = 1) => ({
  id: `session-${sessionNumber}`,
  sessionNumber,
  isMultiDay: false,
  sessionName: `Session ${sessionNumber}`,
  locations: [],
  entities: [],
});
const sessionInput = {
  sessionNumber: 2,
  isMultiDay: false,
  sessionName: 'A Test Session',
  visibility: 'party',
  description: 'Test notes',
  startedOn: '2026-07-18',
  endedOn: '2026-07-18',
  locationIds: [],
  entityIds: [],
};

test('returns 404 when the campaign does not exist', async () => {
  const response = await requestWith(async () => null);
  assert.equal(response.status, 404);
});

test('returns an empty array for an existing campaign without sessions', async () => {
  const response = await requestWith(async () => ({ sessions: [] }));
  assert.deepEqual(await response.json(), []);
});

test('orders sessions by session number and preserves numeric and boolean types', async () => {
  const response = await requestWith(async () => ({
    sessions: [{ ...session('2'), isMultiDay: 0 }, session(1)],
  }));
  const body = await response.json();
  assert.deepEqual(
    body.map((item) => item.sessionNumber),
    [1, 2],
  );
  assert.equal(typeof body[1].sessionNumber, 'number');
  assert.equal(typeof body[1].isMultiDay, 'boolean');
});

test('returns locations and entities as arrays', async () => {
  const response = await requestWith(async () => ({
    sessions: [{ ...session(), locations: [relation], entities: [relation] }],
  }));
  const [body] = await response.json();
  assert.ok(Array.isArray(body.locations));
  assert.ok(Array.isArray(body.entities));
});

test('uses empty relationship arrays when relationships are absent', async () => {
  const response = await requestWith(async () => ({
    sessions: [{ ...session(), locations: null, entities: null }],
  }));
  const [body] = await response.json();
  assert.deepEqual(body.locations, []);
  assert.deepEqual(body.entities, []);
});

test('removes duplicate relationship records', async () => {
  const response = await requestWith(async () => ({
    sessions: [{ ...session(), locations: [relation, relation], entities: [relation, relation] }],
  }));
  const [body] = await response.json();
  assert.equal(body.locations.length, 1);
  assert.equal(body.entities.length, 1);
});

test('passes database errors to the existing error handler', async () => {
  const response = await requestWith(async () => {
    throw new Error('database unavailable');
  });
  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { message: 'handled', cause: 'database unavailable' });
});

test('creates a session with relationship identifiers', async () => {
  let received;
  const response = await requestWith(async () => ({ sessions: [] }), {
    method: 'POST',
    body: sessionInput,
    dependencies: {
      createSession: async (_campaignKey, input) => {
        received = input;
        return { ...session(2), ...input };
      },
    },
  });
  assert.equal(response.status, 201);
  assert.deepEqual(received.locationIds, []);
  assert.deepEqual(received.entityIds, []);
});

test('updates a session and its relationship identifiers', async () => {
  let received;
  const response = await requestWith(async () => ({ sessions: [] }), {
    method: 'PUT',
    path: '/00000000-0000-4000-8000-000000000000',
    body: sessionInput,
    dependencies: {
      updateSession: async (_campaignKey, _sessionId, input) => {
        received = input;
        return { ...session(2), ...input };
      },
    },
  });
  assert.equal(response.status, 200);
  assert.equal(received.sessionName, sessionInput.sessionName);
});

test('requires confirmation and deletes a confirmed session', async () => {
  const missing = await requestWith(async () => ({ sessions: [] }), {
    method: 'DELETE',
    path: '/00000000-0000-4000-8000-000000000000',
    body: {},
    dependencies: { deleteSession: async () => true },
  });
  assert.equal(missing.status, 400);

  const confirmed = await requestWith(async () => ({ sessions: [] }), {
    method: 'DELETE',
    path: '/00000000-0000-4000-8000-000000000000',
    body: { confirmation: 'delete' },
    dependencies: { deleteSession: async () => true },
  });
  assert.equal(confirmed.status, 204);
});
