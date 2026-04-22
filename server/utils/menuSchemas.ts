import { z } from 'zod'

const nonEmptyTitle = z.string().trim().min(1, '請填寫菜單名稱').max(255, '菜單名稱過長')
const uuidSchema = z.string().uuid('id 格式不正確')
const targetSchema = z.enum(['_self', '_blank'], { message: 'target 不正確' })
const customUrlSchema = z
  .string()
  .trim()
  .min(1, '請填寫自訂連結')
  .refine(
    (value) => value.startsWith('/') || /^https?:\/\//i.test(value),
    '自訂連結需為站內路徑（/xxx）或 http(s) URL',
  )

const customLinkSchema = z.object({
  linkType: z.literal('custom'),
  customUrl: customUrlSchema,
  pageId: z.null().optional(),
})

const pageLinkSchema = z.object({
  linkType: z.literal('page'),
  pageId: uuidSchema,
  customUrl: z.null().optional(),
})

export const adminCreateMenuBodySchema = z
  .object({
    title: nonEmptyTitle,
    parentId: uuidSchema.nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
    isVisible: z.boolean().optional(),
    target: targetSchema.optional(),
  })
  .and(z.union([customLinkSchema, pageLinkSchema]))

export const adminPatchMenuBodySchema = z
  .object({
    title: nonEmptyTitle.optional(),
    parentId: uuidSchema.nullable().optional(),
    sortOrder: z.number().int().min(0).max(10_000).optional(),
    isVisible: z.boolean().optional(),
    target: targetSchema.optional(),
    linkType: z.enum(['page', 'custom']).optional(),
    pageId: uuidSchema.nullable().optional(),
    customUrl: customUrlSchema.nullable().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.linkType === 'page' && !val.pageId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '選擇頁面連結時必須提供 pageId',
        path: ['pageId'],
      })
    }
    if (val.linkType === 'custom' && !val.customUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '選擇自訂連結時必須提供 customUrl',
        path: ['customUrl'],
      })
    }
  })

export const adminMenuReorderItemSchema = z.object({
  id: uuidSchema,
  parentId: uuidSchema.nullable(),
  sortOrder: z.number().int().min(0).max(10_000),
  depth: z.number().int().min(0).max(10),
})

export const adminMenuReorderBodySchema = z.object({
  items: z.array(adminMenuReorderItemSchema).min(1, '至少需要一筆排序資料'),
})

