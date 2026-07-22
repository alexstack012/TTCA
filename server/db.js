import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

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
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error);
});

export async function closePool() {
  await pool.end();
}
