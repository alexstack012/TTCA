import 'dotenv/config';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { closePool, databaseConfiguration, pool } from './db.js';
import { createCampaignEntityRouter } from './routes/campaign-entity.routes.js';
import { createCampaignSessionRouter } from './routes/campaign-session.routes.js';
import { createCampaignLocationRouter } from './routes/campaign-location.routes.js';
import { createCampaignStoryRouter } from './routes/campaign-story.routes.js';

const app = express();
const port = Number(process.env.PORT ?? 3000);
const isProduction = process.env.NODE_ENV === 'production';
const imagesDirectory = fileURLToPath(new URL('../public/images/', import.meta.url));
const adminPassword = process.env.ADMIN_PASSWORD ?? (isProduction ? '' : 'keeper');
const clientOrigin = process.env.CLIENT_ORIGIN ?? (isProduction ? '' : 'http://localhost:4200');
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const signingSecret =
  process.env.SESSION_SECRET ?? (isProduction ? '' : 'local-development-secret-change-me');
if (
  !adminPassword ||
  !clientOrigin ||
  signingSecret.length < 32 ||
  (isProduction && adminPassword.length < 12)
) {
  throw new Error(
    'Production requires CLIENT_ORIGIN, an ADMIN_PASSWORD of at least 12 characters, and a SESSION_SECRET of at least 32 characters.',
  );
}

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || 1);
app.use(helmet());
app.use(
  cors({
    origin: clientOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);
app.use('/images', express.static(imagesDirectory, { maxAge: 0 }));
app.use(express.json({ limit: '10kb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

function issueToken(role) {
  const now = Date.now();
  const payload = encode({
    role,
    iat: now,
    exp: now + 8 * 60 * 60 * 1000,
    jti: crypto.randomUUID(),
    aud: 'ttca-api',
  });
  const signature = crypto.createHmac('sha256', signingSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function safePasswordMatch(candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0 || candidate.length > 1024)
    return false;
  const expected = crypto.createHash('sha256').update(adminPassword).digest();
  const actual = crypto.createHash('sha256').update(String(candidate)).digest();
  return crypto.timingSafeEqual(expected, actual);
}

function authenticate(req, res, next) {
  try {
    const authorization = req.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ') || authorization.length > 4096) throw new Error();
    const parts = authorization.slice(7).split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error();
    const [payload, signature] = parts;
    const expected = crypto.createHmac('sha256', signingSecret).update(payload).digest();
    const received = Buffer.from(signature, 'base64url');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected))
      throw new Error();
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (
      session.aud !== 'ttca-api' ||
      !Number.isFinite(session.iat) ||
      !Number.isFinite(session.exp) ||
      session.iat > Date.now() + 60_000 ||
      session.exp <= Date.now() ||
      session.exp - session.iat > 8 * 60 * 60 * 1000 ||
      typeof session.jti !== 'string' ||
      !['editor', 'demo'].includes(session.role)
    )
      throw new Error();
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
      message: 'The service is not ready.',
    });
  }

  try {
    await pool.query('SELECT 1');
    response.json({ status: 'ok' });
  } catch (error) {
    console.error('Database health check failed:', error.message);
    response.status(503).json({
      status: 'error',
      message: 'The service is not ready.',
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
app.use('/api/campaigns', createCampaignLocationRouter({ authenticate, requireEditor }));
app.use('/api/campaigns', createCampaignStoryRouter({ authenticate, requireEditor }));

app.use((error, _request, response, _next) => {
  console.error('Unhandled API error:', error);
  response.status(500).json({
    message: isProduction ? 'An unexpected server error occurred.' : error.message,
  });
});

const server = app.listen(port, () => console.log(`Archive API listening on port ${port}`));
let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; closing the API.`);

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out.');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async (error) => {
    try {
      await closePool();
      if (error) throw error;
      clearTimeout(forceExit);
      process.exit(0);
    } catch (shutdownError) {
      console.error('API shutdown failed:', shutdownError.message);
      process.exit(1);
    }
  });
}

process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
