import { eq } from 'drizzle-orm'
import * as schema from '../../database/schema'
import { getDb } from '../../utils/db'
import { normalizeCustomerProfileData } from '../../utils/customerProfileData'
import { requireStoreCustomerSession } from '../../utils/requireStoreCustomerSession'
import { storeProfilePatchSchema } from '../../utils/storeProfileSchemas'

export default defineEventHandler(async (event) => {
  const { customer } = await requireStoreCustomerSession(event)
  const raw = await readBody(event)
  const parsed = storeProfilePatchSchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.issues[0]?.message ?? '資料驗證失敗',
    })
  }

  const db = getDb(event)
  const currentProfileData = normalizeCustomerProfileData(customer.profileData)
  const mergedAddresses = parsed.data.addresses ?? currentProfileData.addresses
  const mergedShippingMethods =
    parsed.data.preferredShippingMethods ?? currentProfileData.preferredShippingMethods
  const nextDefaultAddressId =
    typeof parsed.data.defaultAddressId === 'undefined'
      ? currentProfileData.defaultAddressId
      : parsed.data.defaultAddressId
  const nextDefaultShippingMethod =
    typeof parsed.data.defaultShippingMethod === 'undefined'
      ? currentProfileData.defaultShippingMethod
      : parsed.data.defaultShippingMethod

  const safeDefaultAddressId =
    nextDefaultAddressId &&
    mergedAddresses.some((item) => item.id === nextDefaultAddressId)
      ? nextDefaultAddressId
      : null
  const safeDefaultShippingMethod =
    nextDefaultShippingMethod &&
    mergedShippingMethods.includes(nextDefaultShippingMethod)
      ? nextDefaultShippingMethod
      : null

  const [updated] = await db
    .update(schema.customers)
    .set({
      fullName: parsed.data.fullName ?? customer.fullName ?? '',
      phone:
        typeof parsed.data.phone === 'undefined'
          ? customer.phone
          : parsed.data.phone || null,
      profileData: {
        addresses: mergedAddresses,
        preferredShippingMethods: mergedShippingMethods,
        defaultAddressId: safeDefaultAddressId,
        defaultShippingMethod: safeDefaultShippingMethod,
      },
      updatedAt: new Date(),
    })
    .where(eq(schema.customers.id, customer.id))
    .returning({
      id: schema.customers.id,
      email: schema.customers.email,
      fullName: schema.customers.fullName,
      phone: schema.customers.phone,
      profileData: schema.customers.profileData,
    })

  if (!updated) {
    throw createError({ statusCode: 500, message: '更新會員資料失敗' })
  }

  const normalized = normalizeCustomerProfileData(updated.profileData)
  return {
    ok: true as const,
    profile: {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName ?? '',
      phone: updated.phone ?? '',
      addresses: normalized.addresses,
      preferredShippingMethods: normalized.preferredShippingMethods,
      defaultAddressId: normalized.defaultAddressId,
      defaultShippingMethod: normalized.defaultShippingMethod,
    },
  }
})
