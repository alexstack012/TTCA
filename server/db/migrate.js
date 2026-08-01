import 'dotenv/config';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const migrationsDirectory = fileURLToPath(new URL('./migrations/', import.meta.url));
const connectionString = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
const client = new Client({
  ...(connectionString
    ? { connectionString }
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

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const filenames = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith('.sql'))
    .sort();
  const applied = new Set(
    (await client.query('SELECT filename FROM schema_migrations')).rows.map((row) => row.filename),
  );

  for (const filename of filenames) {
    if (applied.has(filename)) continue;
    const sql = await readFile(new URL(`./migrations/${filename}`, import.meta.url), 'utf8');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    console.log(`Applied migration: ${filename}`);
  }
} catch (error) {
  console.error('Database migration failed:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
