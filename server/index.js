import 'dotenv/config';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { databaseConfiguration, pool } from './db.js';
import { createCampaignEntityRouter } from './routes/campaign-entity.routes.js';
import { createCampaignSessionRouter } from './routes/campaign-session.routes.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === 'production';
const imagesDirectory = fileURLToPath(new URL('../public/images/', import.meta.url));
const adminPassword = process.env.ADMIN_PASSWORD ?? (isProduction ? '' : 'keeper');
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const signingSecret =
  process.env.SESSION_SECRET ?? (isProduction ? '' : 'local-development-secret-change-me');
if (!adminPassword || !signingSecret)
  throw new Error('ADMIN_PASSWORD and SESSION_SECRET are required in production.');

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:4200' }));
app.use('/images', express.static(imagesDirectory, { maxAge: 0 }));
app.use(express.json({ limit: '10kb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

function issueToken(role) {
  const payload = encode({ role, exp: Date.now() + 8 * 60 * 60 * 1000 });
  const signature = crypto.createHmac('sha256', signingSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function safePasswordMatch(candidate) {
  const expected = crypto.createHash('sha256').update(adminPassword).digest();
  const actual = crypto.createHash('sha256').update(String(candidate)).digest();
  return crypto.timingSafeEqual(expected, actual);
}

function authenticate(req, res, next) {
  try {
    const [payload, signature] = (req.get('authorization') ?? '')
      .replace(/^Bearer /, '')
      .split('.');
    const expected = crypto.createHmac('sha256', signingSecret).update(payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected))
      throw new Error();
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (session.exp < Date.now() || !['editor', 'demo'].includes(session.role)) throw new Error();
    req.user = session;
    next();
  } catch {
    res.status(401).json({ message: 'Your archive session is invalid or has expired.' });
  }
}

export function requireEditor(req, res, next) {
  if (req.user?.role !== 'editor')
    return res.status(403).json({ message: 'The demo archive is read-only.' });
  next();
}

app.get('/api/health', async (_request, response) => {
  if (databaseConfiguration.missingVariables.length) {
    return response.status(503).json({
      status: 'error',
      database: 'not configured',
      message: `Missing database settings: ${databaseConfiguration.missingVariables.join(', ')}`,
    });
  }

  try {
    const result = await pool.query(`
      SELECT
        NOW() AS "databaseTime",
        current_database() AS "database",
        current_user AS "user"
    `);

    response.json({
      status: 'ok',
      ...result.rows[0],
    });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    response.status(503).json({
      status: 'error',
      database: 'unavailable',
      message: 'The API is running, but PostgreSQL could not be reached.',
    });
  }
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  if (!safePasswordMatch(req.body?.password))
    return res.status(401).json({ message: 'That keeper password is not recognized.' });
  res.json({
    token: issueToken('editor'),
    user: { name: 'Keeper', role: 'editor', canEdit: true },
  });
});

app.post('/api/auth/demo', loginLimiter, (_req, res) =>
  res.json({ token: issueToken('demo'), user: { name: 'Traveler', role: 'demo', canEdit: false } }),
);

app.get('/api/auth/me', authenticate, (req, res) =>
  res.json({
    user: {
      name: req.user.role === 'editor' ? 'Keeper' : 'Traveler',
      role: req.user.role,
      canEdit: req.user.role === 'editor',
    },
  }),
);

app.use('/api/campaigns', createCampaignEntityRouter({ authenticate, requireEditor }));
app.use('/api/campaigns', createCampaignSessionRouter({ authenticate, requireEditor }));

app.post('/api/archive/example-write', authenticate, requireEditor, (_req, res) =>
  res.status(501).json({ message: 'Database setup is the next step.' }),
);

app.use((error, _request, response, _next) => {
  console.error('Unhandled API error:', error);
  response.status(500).json({
    message: isProduction ? 'An unexpected server error occurred.' : error.message,
  });
});

app.listen(port, () => console.log(`Archive API listening on http://localhost:${port}`));
