import { z } from 'zod'
import { productSlugSchema } from './productSchemas'

const uuidNullable = z.union([z.string().uuid(), z.null()])

export const categoryStatusSchema = z.enum(['active', 'hidden'])

export const adminCreateCategoryBodySchema = z.object({
  name: z.string().trim().min(1, '請填寫分類名稱').max(255),
  slug: productSlugSchema,
  description: z
    .string()
    .trim()
    .max(20000)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  parentId: uuidNullable.optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional().default(0),
  status: categoryStatusSchema.optional().default('active'),
})

export const adminPatchCategoryBodySchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  slug: productSlugSchema.optional(),
  description: z
    .string()
    .trim()
    .max(20000)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v)),
  parentId: uuidNullable.optional(),
  sortOrder: z.number().int().min(0).max(1_000_000).optional(),
  status: categoryStatusSchema.optional(),
})
