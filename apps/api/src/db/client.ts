import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

const connectionString =
  process.env.DATABASE_URL ?? 'postgresql://wrenchlog:changeme@db:5432/wrenchlog';

const queryClient = postgres(connectionString, {
  prepare: false,
});

export const db = drizzle(queryClient, { schema });
