import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  primaryKey,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import {
  sqliteTable,
  text as sqliteText,
  integer as sqliteInt,
  uniqueIndex as sqliteUniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ============================================================================
// PostgreSQL Schema
// ============================================================================

export const teamsPg = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const schemasPg = pgTable('schemas', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .references(() => teamsPg.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueTeamName: uniqueIndex('unique_team_name').on(table.teamId, table.name),
}));

export const typeDefinitionsPg = pgTable('type_definitions', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id')
    .references(() => teamsPg.id, { onDelete: 'cascade' })
    .notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  content: text('content').notNull(),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  uniqueTeamName: uniqueIndex('unique_team_name').on(table.teamId, table.name),
}));

export const schemaHistoryPg = pgTable('schema_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  schemaId: uuid('schema_id')
    .references(() => schemasPg.id, { onDelete: 'cascade' })
    .notNull(),
  version: integer('version').notNull(),
  content: text('content').notNull(),
  changedBy: varchar('changed_by', { length: 255 }),
  changeMessage: text('change_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ============================================================================
// SQLite Schema
// ============================================================================

export const teamsSqlite = sqliteTable('teams', {
  id: sqliteText('id').primaryKey(),
  name: sqliteText('name').notNull(),
  createdAt: sqliteInt('created_at', { mode: 'timestamp' }).default(new Date()),
});

export const schemasSqlite = sqliteTable('schemas', {
  id: sqliteText('id').primaryKey(),
  teamId: sqliteText('team_id')
    .references(() => teamsSqlite.id, { onDelete: 'cascade' })
    .notNull(),
  name: sqliteText('name').notNull(),
  fileName: sqliteText('file_name').notNull(),
  content: sqliteText('content').notNull(),
  version: sqliteInt('version').default(1).notNull(),
  createdAt: sqliteInt('created_at', { mode: 'timestamp' }).default(new Date()),
  updatedAt: sqliteInt('updated_at', { mode: 'timestamp' }).default(new Date()),
}, (table) => ({
  uniqueTeamName: sqliteUniqueIndex('unique_team_name').on(table.teamId, table.name),
}));

export const typeDefinitionsSqlite = sqliteTable('type_definitions', {
  id: sqliteText('id').primaryKey(),
  teamId: sqliteText('team_id')
    .references(() => teamsSqlite.id, { onDelete: 'cascade' })
    .notNull(),
  name: sqliteText('name').notNull(),
  fileName: sqliteText('file_name').notNull(),
  content: sqliteText('content').notNull(),
  version: sqliteInt('version').default(1).notNull(),
  createdAt: sqliteInt('created_at', { mode: 'timestamp' }).default(new Date()),
  updatedAt: sqliteInt('updated_at', { mode: 'timestamp' }).default(new Date()),
}, (table) => ({
  uniqueTeamName: sqliteUniqueIndex('unique_team_name').on(table.teamId, table.name),
}));

export const schemaHistorySqlite = sqliteTable('schema_history', {
  id: sqliteText('id').primaryKey(),
  schemaId: sqliteText('schema_id')
    .references(() => schemasSqlite.id, { onDelete: 'cascade' })
    .notNull(),
  version: sqliteInt('version').notNull(),
  content: sqliteText('content').notNull(),
  changedBy: sqliteText('changed_by'),
  changeMessage: sqliteText('change_message'),
  createdAt: sqliteInt('created_at', { mode: 'timestamp' }).default(new Date()),
});

// ============================================================================
// Type Definitions (shared between PG and SQLite)
// ============================================================================

export type Team = {
  id: string;
  name: string;
  createdAt: Date;
};

export type NewTeam = Omit<Team, 'id' | 'createdAt'>;

export type Schema = {
  id: string;
  teamId: string;
  name: string;
  fileName: string;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewSchema = Omit<Schema, 'id' | 'version' | 'createdAt' | 'updatedAt'>;

export type TypeDefinition = {
  id: string;
  teamId: string;
  name: string;
  fileName: string;
  content: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NewTypeDefinition = Omit<TypeDefinition, 'id' | 'version' | 'createdAt' | 'updatedAt'>;

export type SchemaHistory = {
  id: string;
  schemaId: string;
  version: number;
  content: string;
  changedBy?: string;
  changeMessage?: string;
  createdAt: Date;
};

export type NewSchemaHistory = Omit<SchemaHistory, 'id' | 'createdAt'>;
