import * as schema from '@/db/schema'
import { roastVariants, roasts } from '@/db/schema'
import type {
  NewRoast,
  NewRoastVariant,
  Roast,
  RoastVariant,
} from '@/db/schema'
import { asc, desc, eq, inArray } from 'drizzle-orm'
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite'

type DbClient = ExpoSQLiteDatabase<typeof schema>
type SaveRoastGenerationInput = Pick<
  NewRoast,
  | 'requestId'
  | 'model'
  | 'audience'
  | 'burnLevel'
  | 'inputType'
  | 'inputText'
  | 'inputImageUri'
> & {
  variants: NewRoastVariant['content'][]
}

export type RoastWithVariants = Roast & { variants: RoastVariant[] }

export async function saveRoastGeneration(
  db: DbClient,
  input: SaveRoastGenerationInput
): Promise<Roast['id'] | null> {
  const variants = input.variants
    .map((value) => value.trim())
    .filter((value) => value.length > 0)

  if (variants.length === 0) return null

  try {
    await db
      .insert(roasts)
      .values({
        requestId: input.requestId,
        model: input.model,
        audience: input.audience,
        burnLevel: input.burnLevel,
        inputType: input.inputType,
        inputText: input.inputText ?? null,
        inputImageUri: input.inputImageUri ?? null,
        status: 'completed',
        variantCount: variants.length,
        selectedVariantIndex: 0,
      })
      .onConflictDoUpdate({
        target: roasts.requestId,
        set: {
          model: input.model,
          audience: input.audience,
          burnLevel: input.burnLevel,
          inputType: input.inputType,
          inputText: input.inputText ?? null,
          inputImageUri: input.inputImageUri ?? null,
          status: 'completed',
          variantCount: variants.length,
          updatedAt: Date.now(),
        },
      })

    const [savedRoast] = await db
      .select({ id: roasts.id })
      .from(roasts)
      .where(eq(roasts.requestId, input.requestId))
      .limit(1)

    if (!savedRoast) return null

    await db.delete(roastVariants).where(eq(roastVariants.roastId, savedRoast.id))
    await db.insert(roastVariants).values(
      variants.map((content, index) => ({
        roastId: savedRoast.id,
        variantIndex: index,
        content,
      }))
    )
    return savedRoast.id
  } catch (error) {
    console.warn('saveRoastGeneration failed', error)
    return null
  }
}

export async function listRoastHistory(
  db: DbClient,
  limit = 50
): Promise<RoastWithVariants[]> {
  try {
    const roastRows = await db
      .select()
      .from(roasts)
      .orderBy(desc(roasts.createdAt))
      .limit(limit)

    if (roastRows.length === 0) return []

    const roastIds = roastRows.map((row) => row.id)
    const variantRows = await db
      .select()
      .from(roastVariants)
      .where(inArray(roastVariants.roastId, roastIds))
      .orderBy(asc(roastVariants.variantIndex))

    const variantsByRoastId = new Map<number, RoastVariant[]>()
    for (const variant of variantRows) {
      const existing = variantsByRoastId.get(variant.roastId) ?? []
      existing.push(variant)
      variantsByRoastId.set(variant.roastId, existing)
    }

    return roastRows.map((row) => ({
      ...row,
      variants: variantsByRoastId.get(row.id) ?? [],
    }))
  } catch (error) {
    console.warn('listRoastHistory failed', error)
    return []
  }
}

export async function getRoastById(
  db: DbClient,
  roastId: Roast['id']
): Promise<RoastWithVariants | null> {
  try {
    const [roastRow] = await db
      .select()
      .from(roasts)
      .where(eq(roasts.id, roastId))
      .limit(1)

    if (!roastRow) return null

    const variants = await db
      .select()
      .from(roastVariants)
      .where(eq(roastVariants.roastId, roastId))
      .orderBy(asc(roastVariants.variantIndex))

    return {
      ...roastRow,
      variants,
    }
  } catch (error) {
    console.warn('getRoastById failed', error)
    return null
  }
}

export async function updateRoastSelectedVariantIndex(
  db: DbClient,
  roastId: Roast['id'],
  selectedVariantIndex: Roast['selectedVariantIndex']
): Promise<void> {
  try {
    await db
      .update(roasts)
      .set({
        selectedVariantIndex,
        updatedAt: Date.now(),
      })
      .where(eq(roasts.id, roastId))
  } catch (error) {
    console.warn('updateRoastSelectedVariantIndex failed', error)
  }
}

export async function setRoastVariantFavorite(
  db: DbClient,
  variantId: RoastVariant['id'],
  isFavorite: RoastVariant['isFavorite']
): Promise<void> {
  try {
    await db
      .update(roastVariants)
      .set({ isFavorite })
      .where(eq(roastVariants.id, variantId))
  } catch (error) {
    console.warn('setRoastVariantFavorite failed', error)
  }
}

export async function deleteRoastById(
  db: DbClient,
  roastId: Roast['id']
): Promise<void> {
  try {
    await db.delete(roasts).where(eq(roasts.id, roastId))
  } catch (error) {
    console.warn('deleteRoastById failed', error)
    throw error
  }
}

export async function clearRoastHistory(db: DbClient): Promise<void> {
  try {
    await db.delete(roasts)
  } catch (error) {
    console.warn('clearRoastHistory failed', error)
    throw error
  }
}
