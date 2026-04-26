<script setup lang="ts">
import { formatHkd } from '~/utils/formatHkd'

definePageMeta({
  layout: 'default',
})

type OrderRow = {
  id: string
  orderUuid: string
  status: string
  currency: string
  total: string
  createdAt: string
}

const requestFetch = useRequestFetch()
const { customer, refresh } = useCustomerAuth()
const route = useRoute()
await refresh()

if (!customer.value) {
  await navigateTo('/login?redirect=/profile/orders')
}

const { data, error } = await useAsyncData('store-orders-list', () =>
  requestFetch<{ orders: OrderRow[] }>('/api/store/orders'),
)

function statusLabel(s: string) {
  if (s === 'paid') return '已付款'
  if (s === 'pending_payment') return '待付款'
  if (s === 'payment_failed') return '付款失敗'
  if (s === 'shipping') return '運送中'
  if (s === 'signed') return '已簽收'
  return s
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
        <h1 class="text-2xl font-semibold tracking-tight text-neutral-900">我的訂單</h1>

        <p v-if="error" class="mt-6 text-sm text-red-600">{{ error.message }}</p>

        <p v-else-if="!data || data.orders.length === 0" class="mt-6 text-sm text-neutral-600">
          目前沒有訂單紀錄。
        </p>

        <ul v-else class="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
          <li v-for="o in data.orders" :key="o.id" class="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-sm font-medium text-neutral-900">訂單 {{ o.orderUuid }}</p>
              <p class="mt-1 text-xs text-neutral-500">{{ new Date(o.createdAt).toLocaleString() }}</p>
            </div>
            <div class="flex items-center gap-3">
              <span class="rounded bg-neutral-100 px-2 py-1 text-xs text-neutral-700">{{ statusLabel(o.status) }}</span>
              <span class="text-sm font-semibold text-neutral-900">{{ formatHkd(o.total) }}</span>
              <NuxtLink :to="`/invoices/${o.orderUuid}`" class="text-sm text-neutral-700 underline">查看發票</NuxtLink>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
