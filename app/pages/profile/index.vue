<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const { customer, refresh } = useCustomerAuth()
const requestFetch = useRequestFetch()
const fullName = ref('')
const phone = ref('')
type AddressBookItem = {
  id: string
  label?: string
  name?: string
  email?: string
  phone?: string
  address: string
  remarks?: string
}
const addresses = ref<AddressBookItem[]>([])
const defaultAddressId = ref<string | null>(null)
const preferredShippingMethods = ref<string[]>([])
const defaultShippingMethod = ref<string | null>(null)
const newShippingMethod = ref('')
const saving = ref(false)
const errorMessage = ref<string | null>(null)
const successMessage = ref<string | null>(null)
const route = useRoute()

await refresh()

if (!tenantSlug.value) {
  await navigateTo('/')
}

if (!customer.value) {
  await navigateTo('/login?redirect=/profile')
}

const { data, error, refresh: refreshProfile } = await useAsyncData(
  'store-profile',
  () =>
    requestFetch<{
      profile: {
        fullName: string
        email: string
        phone: string
        addresses: AddressBookItem[]
        preferredShippingMethods: string[]
        defaultAddressId: string | null
        defaultShippingMethod: string | null
      }
    }>('/api/store/profile'),
)

watch(
  () => data.value,
  (v) => {
    if (!v) return
    fullName.value = v.profile.fullName
    phone.value = v.profile.phone
    addresses.value = [...(v.profile.addresses ?? [])]
    defaultAddressId.value = v.profile.defaultAddressId ?? null
    preferredShippingMethods.value = [...(v.profile.preferredShippingMethods ?? [])]
    defaultShippingMethod.value = v.profile.defaultShippingMethod ?? null
  },
  { immediate: true },
)

function createAddressId() {
  return `addr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function addAddress() {
  const item: AddressBookItem = {
    id: createAddressId(),
    label: '',
    name: fullName.value || '',
    email: data.value?.profile.email || customer.value?.email || '',
    phone: phone.value || '',
    address: '',
    remarks: '',
  }
  addresses.value.push(item)
  if (!defaultAddressId.value) defaultAddressId.value = item.id
}

function removeAddress(id: string) {
  addresses.value = addresses.value.filter((item) => item.id !== id)
  if (defaultAddressId.value === id) {
    defaultAddressId.value = addresses.value[0]?.id ?? null
  }
}

function addShippingMethod() {
  const value = newShippingMethod.value.trim()
  if (!value) return
  if (!preferredShippingMethods.value.includes(value)) {
    preferredShippingMethods.value.push(value)
  }
  if (!defaultShippingMethod.value) defaultShippingMethod.value = value
  newShippingMethod.value = ''
}

function removeShippingMethod(method: string) {
  preferredShippingMethods.value = preferredShippingMethods.value.filter((item) => item !== method)
  if (defaultShippingMethod.value === method) {
    defaultShippingMethod.value = preferredShippingMethods.value[0] ?? null
  }
}

async function onSubmit() {
  errorMessage.value = null
  successMessage.value = null
  saving.value = true
  try {
    await requestFetch('/api/store/profile', {
      method: 'PATCH',
      body: {
        fullName: fullName.value,
        phone: phone.value,
        addresses: addresses.value
          .map((item) => ({
            id: item.id,
            label: item.label?.trim() || '',
            name: item.name?.trim() || '',
            email: item.email?.trim() || '',
            phone: item.phone?.trim() || '',
            address: item.address?.trim() || '',
            remarks: item.remarks?.trim() || '',
          }))
          .filter((item) => item.address),
        preferredShippingMethods: preferredShippingMethods.value,
        defaultAddressId: defaultAddressId.value,
        defaultShippingMethod: defaultShippingMethod.value,
      },
    })
    await refreshProfile()
    await refresh()
    successMessage.value = '會員資料已更新'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMessage.value = err.data?.message || err.message || '更新失敗'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <div class="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <aside class="h-fit rounded-lg border border-neutral-200 bg-white p-3">
        <p class="px-2 pb-2 text-xs font-semibold uppercase tracking-widest text-neutral-500">
          會員中心
        </p>
        <nav class="space-y-1">
          <NuxtLink
            to="/profile"
            class="block rounded-md px-3 py-2 text-sm"
            :class="route.path === '/profile' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'"
          >
            我的資料
          </NuxtLink>
          <NuxtLink
            to="/profile/orders"
            class="block rounded-md px-3 py-2 text-sm"
            :class="route.path.startsWith('/profile/orders') ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-50'"
          >
            我的訂單
          </NuxtLink>
        </nav>
      </aside>

      <section>
        <h1 class="text-2xl font-semibold tracking-tight text-neutral-900">
          我的資料
        </h1>
        <p class="mt-2 text-sm text-neutral-600">管理你的聯絡資料。</p>

        <p v-if="error" class="mt-6 text-sm text-red-600">
          {{ error.message }}
        </p>

        <form v-else class="mt-6 space-y-4 rounded-lg border border-neutral-200 bg-white p-5" @submit.prevent="onSubmit">
          <div>
            <label class="block text-xs font-medium text-neutral-700" for="email">電子郵件（不可修改）</label>
            <input
              id="email"
              :value="data?.profile.email || customer?.email || ''"
              disabled
              class="mt-1 w-full rounded-md border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm text-neutral-500"
            >
          </div>

          <div>
            <label class="block text-xs font-medium text-neutral-700" for="fullName">姓名</label>
            <input
              id="fullName"
              v-model="fullName"
              required
              maxlength="120"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            >
          </div>

          <div>
            <label class="block text-xs font-medium text-neutral-700" for="phone">電話（選填）</label>
            <input
              id="phone"
              v-model="phone"
              maxlength="32"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            >
          </div>

          <div class="rounded-md border border-neutral-200 p-4">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold text-neutral-900">地址管理</p>
              <button
                type="button"
                class="rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50"
                @click="addAddress"
              >
                新增地址
              </button>
            </div>
            <p class="mt-1 text-xs text-neutral-500">可在付款頁快速套用已儲存地址。</p>

            <div v-if="addresses.length === 0" class="mt-3 text-sm text-neutral-500">
              尚未設定地址。
            </div>

            <div v-for="(addr, idx) in addresses" :key="addr.id" class="mt-3 rounded-md border border-neutral-200 p-3">
              <div class="flex items-center justify-between gap-2">
                <p class="text-xs font-medium text-neutral-700">地址 {{ idx + 1 }}</p>
                <button
                  type="button"
                  class="text-xs text-red-600 hover:underline"
                  @click="removeAddress(addr.id)"
                >
                  刪除
                </button>
              </div>
              <div class="mt-2 grid gap-3 sm:grid-cols-2">
                <input v-model="addr.label" placeholder="標籤（例如：屋企）" class="rounded-md border border-neutral-300 px-3 py-2 text-sm">
                <label class="inline-flex items-center gap-2 text-xs text-neutral-700">
                  <input v-model="defaultAddressId" type="radio" :value="addr.id">
                  設為預設地址
                </label>
                <input v-model="addr.name" placeholder="收件人姓名" class="rounded-md border border-neutral-300 px-3 py-2 text-sm">
                <input v-model="addr.phone" placeholder="收件電話" class="rounded-md border border-neutral-300 px-3 py-2 text-sm">
                <input v-model="addr.email" placeholder="收件 Email" class="rounded-md border border-neutral-300 px-3 py-2 text-sm sm:col-span-2">
                <textarea v-model="addr.address" rows="2" placeholder="地址" class="rounded-md border border-neutral-300 px-3 py-2 text-sm sm:col-span-2" />
                <textarea v-model="addr.remarks" rows="2" placeholder="備註（選填）" class="rounded-md border border-neutral-300 px-3 py-2 text-sm sm:col-span-2" />
              </div>
            </div>
          </div>

          <div class="rounded-md border border-neutral-200 p-4">
            <p class="text-sm font-semibold text-neutral-900">運送方式管理</p>
            <p class="mt-1 text-xs text-neutral-500">可預存常用運送方式，付款頁可一鍵選擇。</p>
            <div class="mt-3 flex gap-2">
              <input
                v-model="newShippingMethod"
                placeholder="例如：順豐站自取"
                class="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
              <button
                type="button"
                class="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                @click="addShippingMethod"
              >
                新增
              </button>
            </div>
            <div v-if="preferredShippingMethods.length === 0" class="mt-3 text-sm text-neutral-500">
              尚未設定常用運送方式。
            </div>
            <ul v-else class="mt-3 space-y-2">
              <li v-for="method in preferredShippingMethods" :key="method" class="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2">
                <label class="inline-flex items-center gap-2 text-sm text-neutral-800">
                  <input v-model="defaultShippingMethod" type="radio" :value="method">
                  {{ method }}
                </label>
                <button
                  type="button"
                  class="text-xs text-red-600 hover:underline"
                  @click="removeShippingMethod(method)"
                >
                  刪除
                </button>
              </li>
            </ul>
          </div>

          <p v-if="errorMessage" class="text-sm text-red-600">{{ errorMessage }}</p>
          <p v-if="successMessage" class="text-sm text-emerald-700">{{ successMessage }}</p>

          <button
            type="submit"
            class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
            :disabled="saving"
          >
            {{ saving ? '儲存中...' : '儲存資料' }}
          </button>
        </form>
      </section>
    </div>
  </div>
</template>
