import { z } from 'zod'

export const adminCreateAttachmentBodySchema = z
  .object({
    type: z.string().trim().min(1).max(32),
    mimetype: z.string().trim().min(1).max(128),
    filename: z.string().trim().min(1).max(255),
    extension: z.string().trim().min(1).max(32),
    size: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional().default(0),
    storageKey: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
    publicUrl: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .nullable()
      .transform((v) => (v === '' ? null : v)),
  })
  .refine((d) => !!(d.publicUrl || d.storageKey), {
    message: '請提供 publicUrl 或 storageKey 至少其一',
  })
