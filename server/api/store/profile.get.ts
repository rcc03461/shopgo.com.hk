import { requireStoreCustomerSession } from '../../utils/requireStoreCustomerSession'
import { normalizeCustomerProfileData } from '../../utils/customerProfileData'

export default defineEventHandler(async (event) => {
  const { customer } = await requireStoreCustomerSession(event)
  const profileData = normalizeCustomerProfileData(customer.profileData)
  return {
    profile: {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName ?? '',
      phone: customer.phone ?? '',
      addresses: profileData.addresses,
      preferredShippingMethods: profileData.preferredShippingMethods,
      defaultAddressId: profileData.defaultAddressId,
      defaultShippingMethod: profileData.defaultShippingMethod,
    },
  }
})
