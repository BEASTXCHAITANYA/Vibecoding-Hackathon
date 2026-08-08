import { pgTable, text, timestamp, integer, serial, index, jsonb } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  charterJson: jsonb('charter_json'),
  lastPublishedAt: timestamp('last_published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const posts = pgTable('posts', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  rationale: text('rationale').notNull(),
  sources: text('sources').array().notNull(),
  createdAt: timestamp('created_at').notNull(),
}, (table) => [
  index('posts_agent_id_created_at_idx').on(table.agentId, table.createdAt.desc()),
]);

export const candidates = pgTable('candidates', {
  id: text('id').primaryKey(),
  agentId: text('agent_id').notNull().references(() => agents.id, { onDelete: 'cascade' }),
  topic: text('topic').notNull(),
  sourceUrl: text('source_url').notNull(),
  source: text('source').notNull(),
  score: integer('score').notNull(),
  verdict: text('verdict').notNull(),
  reason: text('reason').notNull(),
  seenAt: timestamp('seen_at').notNull(),
}, (table) => [
  index('candidates_agent_id_seen_at_idx').on(table.agentId, table.seenAt.desc()),
]);

export const ticks = pgTable('ticks', {
  id: serial('id').primaryKey(),
  ranAt: timestamp('ran_at').notNull().defaultNow(),
  action: text('action').notNull(),
  note: text('note').notNull(),
});
