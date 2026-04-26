import { z } from 'zod'

const addressItemSchema = z.object({
  id: z.string().trim().min(1).max(64),
  label: z.string().trim().max(80).optional(),
  name: z.string().trim().max(120).optional(),
  email: z.union([z.string().trim().email(), z.literal('')]).optional(),
  phone: z.string().trim().max(64).optional(),
  address: z.string().trim().min(1, '地址不可為空').max(2000),
  remarks: z.string().trim().max(2000).optional(),
})

export const storeProfilePatchSchema = z.object({
  fullName: z.string().trim().min(1, '請輸入姓名').max(120, '姓名過長').optional(),
  phone: z
    .string()
    .trim()
    .max(32, '電話過長')
    .optional(),
  addresses: z.array(addressItemSchema).max(20).optional(),
  preferredShippingMethods: z.array(z.string().trim().min(1).max(64)).max(20).optional(),
  defaultAddressId: z.union([z.string().trim().max(64), z.null()]).optional(),
  defaultShippingMethod: z.union([z.string().trim().max(64), z.null()]).optional(),
})
