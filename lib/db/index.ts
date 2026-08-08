import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  // Fail with a safe error message that doesn't expose environment details
  throw new Error('Database connection error: Required configuration is missing.');
}

const sql = neon(databaseUrl);
export const db = drizzle(sql, { schema });
export type DatabaseClient = typeof db;
