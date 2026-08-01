import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

const requiredLocalVariables = ['PGHOST', 'PGDATABASE', 'PGUSER', 'PGPASSWORD'];
export const databaseConfiguration = {
  usesConnectionString: Boolean(process.env.DATABASE_URL),
  missingVariables: process.env.DATABASE_URL
    ? []
    : requiredLocalVariables.filter((variable) => !process.env[variable]),
};

export const pool = new Pool({
  ...(process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST,
        port: Number(process.env.PGPORT ?? 5432),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      }),
  ssl:
    process.env.DATABASE_SSL === 'true'
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
  max: positiveInteger(process.env.PGPOOL_MAX, 10),
  connectionTimeoutMillis: positiveInteger(process.env.PG_CONNECTION_TIMEOUT_MS, 5000),
  idleTimeoutMillis: positiveInteger(process.env.PG_IDLE_TIMEOUT_MS, 30000),
  statement_timeout: positiveInteger(process.env.PG_STATEMENT_TIMEOUT_MS, 15000),
  query_timeout: positiveInteger(process.env.PG_QUERY_TIMEOUT_MS, 20000),
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

export async function closePool() {
  await pool.end();
}
