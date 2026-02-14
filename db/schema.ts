import { relations, sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const roasts = sqliteTable(
  'roasts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    requestId: text('request_id').notNull(),
    provider: text('provider').notNull().default('gemini'),
    model: text('model').notNull(),

    inputType: text('input_type', { enum: ['text', 'image'] }).notNull(),
    inputText: text('input_text'),
    inputImageUri: text('input_image_uri'),

    audience: text('audience', {
      enum: ['Bestie', 'Sibling', 'Ex', 'Coworker', 'Self', 'Stranger'],
    }).notNull(),
    burnLevel: integer('burn_level').notNull(),

    status: text('status', { enum: ['pending', 'completed', 'failed'] })
      .notNull()
      .default('pending'),
    errorMessage: text('error_message'),

    variantCount: integer('variant_count').notNull().default(1),
    selectedVariantIndex: integer('selected_variant_index').notNull().default(0),

    createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer('updated_at').notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    requestIdUq: uniqueIndex('roasts_request_id_uq').on(t.requestId),
    createdAtIdx: index('roasts_created_at_idx').on(t.createdAt),
  })
)

export const roastVariants = sqliteTable(
  'roast_variants',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    roastId: integer('roast_id')
      .notNull()
      .references(() => roasts.id, { onDelete: 'cascade' }),

    variantIndex: integer('variant_index').notNull(), // 0,1,2
    content: text('content').notNull(),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),

    createdAt: integer('created_at').notNull().default(sql`(unixepoch() * 1000)`),
  },
  (t) => ({
    roastIdIdx: index('roast_variants_roast_id_idx').on(t.roastId),
    roastVariantUq: uniqueIndex('roast_variants_roast_id_variant_idx_uq').on(
      t.roastId,
      t.variantIndex
    ),
  })
)

export const roastsRelations = relations(roasts, ({ many }) => ({
  variants: many(roastVariants),
}))

export const roastVariantsRelations = relations(roastVariants, ({ one }) => ({
  roast: one(roasts, {
    fields: [roastVariants.roastId],
    references: [roasts.id],
  }),
}))

export type Roast = typeof roasts.$inferSelect
export type NewRoast = typeof roasts.$inferInsert
export type RoastVariant = typeof roastVariants.$inferSelect
export type NewRoastVariant = typeof roastVariants.$inferInsert


