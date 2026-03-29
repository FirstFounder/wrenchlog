import { relations, sql } from 'drizzle-orm';
import {
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const clients = pgTable('clients', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  notes: text('notes'),
  ...timestamps,
});

export const vehicles = pgTable('vehicles', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  clientId: uuid('client_id')
    .notNull()
    .references(() => clients.id),
  year: integer('year'),
  make: text('make'),
  model: text('model'),
  vin: text('vin'),
  notes: text('notes'),
  ...timestamps,
});

export const jobs = pgTable('jobs', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  vehicleId: uuid('vehicle_id')
    .notNull()
    .references(() => vehicles.id),
  title: text('title').notNull(),
  status: text('status').notNull().default('open'),
  openedAt: timestamp('opened_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  notes: text('notes'),
  ...timestamps,
});

export const timeEntries = pgTable('time_entries', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  notes: text('notes'),
  ...timestamps,
});

export const mediaAssets = pgTable('media_assets', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id),
  type: text('type'),
  storagePath: text('storage_path'),
  mimeType: text('mime_type'),
  ...timestamps,
});

export const transcripts = pgTable('transcripts', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  mediaAssetId: uuid('media_asset_id').references(() => mediaAssets.id),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id),
  content: text('content'),
  whisperModel: text('whisper_model'),
  ...timestamps,
});

export const knowledgeEntries = pgTable('knowledge_entries', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  sourceTranscriptId: uuid('source_transcript_id').references(() => transcripts.id),
  jobId: uuid('job_id').references(() => jobs.id),
  content: text('content'),
  tags: text('tags').array(),
  ...timestamps,
});

export const batchJobs = pgTable('batch_jobs', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  type: text('type').notNull(),
  status: text('status').notNull().default('pending'),
  payload: jsonb('payload'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  error: text('error'),
  ...timestamps,
});

export const invoices = pgTable('invoices', {
  id: uuid('id').default(sql`gen_random_uuid()`).primaryKey(),
  jobId: uuid('job_id')
    .notNull()
    .references(() => jobs.id),
  issuedAt: timestamp('issued_at', { withTimezone: true }),
  pdfPath: text('pdf_path'),
  lineItems: jsonb('line_items'),
  ...timestamps,
});

export const appConfig = pgTable(
  'app_config',
  {
    key: text('key').notNull(),
    value: text('value'),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.key] })],
);

export const clientsRelations = relations(clients, ({ many }) => ({
  vehicles: many(vehicles),
}));

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  client: one(clients, {
    fields: [vehicles.clientId],
    references: [clients.id],
  }),
  jobs: many(jobs),
}));

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  vehicle: one(vehicles, {
    fields: [jobs.vehicleId],
    references: [vehicles.id],
  }),
  timeEntries: many(timeEntries),
  mediaAssets: many(mediaAssets),
  transcripts: many(transcripts),
  knowledgeEntries: many(knowledgeEntries),
  invoices: many(invoices),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  job: one(jobs, {
    fields: [timeEntries.jobId],
    references: [jobs.id],
  }),
}));

export const mediaAssetsRelations = relations(mediaAssets, ({ one, many }) => ({
  job: one(jobs, {
    fields: [mediaAssets.jobId],
    references: [jobs.id],
  }),
  transcripts: many(transcripts),
}));

export const transcriptsRelations = relations(transcripts, ({ one, many }) => ({
  mediaAsset: one(mediaAssets, {
    fields: [transcripts.mediaAssetId],
    references: [mediaAssets.id],
  }),
  job: one(jobs, {
    fields: [transcripts.jobId],
    references: [jobs.id],
  }),
  knowledgeEntries: many(knowledgeEntries),
}));

export const knowledgeEntriesRelations = relations(knowledgeEntries, ({ one }) => ({
  sourceTranscript: one(transcripts, {
    fields: [knowledgeEntries.sourceTranscriptId],
    references: [transcripts.id],
  }),
  job: one(jobs, {
    fields: [knowledgeEntries.jobId],
    references: [jobs.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  job: one(jobs, {
    fields: [invoices.jobId],
    references: [jobs.id],
  }),
}));
