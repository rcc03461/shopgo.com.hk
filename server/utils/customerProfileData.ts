import type { CustomerAddressBookItem, CustomerProfileDataJson } from '../database/schema'

function asTrimmedString(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

function normalizeAddressItem(raw: unknown): CustomerAddressBookItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const item = raw as Record<string, unknown>
  const id = asTrimmedString(item.id, 64)
  const address = asTrimmedString(item.address, 2000)
  if (!id || !address) return null
  const label = asTrimmedString(item.label, 80)
  const name = asTrimmedString(item.name, 120)
  const email = asTrimmedString(item.email, 255)
  const phone = asTrimmedString(item.phone, 64)
  const remarks = asTrimmedString(item.remarks, 2000)
  return {
    id,
    address,
    ...(label ? { label } : {}),
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(remarks ? { remarks } : {}),
  }
}

export function normalizeCustomerProfileData(
  raw: unknown,
): Required<CustomerProfileDataJson> {
  const data =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const addressesRaw = Array.isArray(data.addresses) ? data.addresses : []
  const addresses = addressesRaw
    .map((item) => normalizeAddressItem(item))
    .filter((item): item is CustomerAddressBookItem => Boolean(item))
    .slice(0, 20)
  const preferredShippingMethodsRaw = Array.isArray(data.preferredShippingMethods)
    ? data.preferredShippingMethods
    : []
  const preferredShippingMethods = Array.from(
    new Set(
      preferredShippingMethodsRaw
        .map((item) => asTrimmedString(item, 64))
        .filter((item) => Boolean(item)),
    ),
  ).slice(0, 20)
  const defaultAddressId = asTrimmedString(data.defaultAddressId, 64) || null
  const defaultShippingMethod =
    asTrimmedString(data.defaultShippingMethod, 64) || null
  return {
    addresses,
    preferredShippingMethods,
    defaultAddressId,
    defaultShippingMethod,
  }
}
