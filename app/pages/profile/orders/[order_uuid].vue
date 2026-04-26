<script setup lang="ts">
import { formatHkd } from '~/utils/formatHkd'

definePageMeta({
  layout: 'default',
})

type OrderDetail = {
  id: string
  orderUuid: string
  status: string
  currency: string
  subtotal: string
  total: string
  customerEmail: string | null
  paymentProvider: string | null
  createdAt: string
  lines: {
    id: string
    title: string
    sku: string
    unitPrice: string
    quantity: number
    lineTotal: string
  }[]
}

type TimelineEvent = {
  id: string
  eventType: string
  note: string | null
  eventAt: string
}

const route = useRoute()
const requestFetch = useRequestFetch()
const { customer, refresh } = useCustomerAuth()
await refresh()

if (!customer.value) {
  await navigateTo('/login?redirect=/profile/orders')
}

const orderUuid = computed(() => String(route.params.order_uuid || ''))
const { data, error } = await useAsyncData(
  'store-order-detail',
  () => requestFetch<{ order: OrderDetail }>(`/api/store/orders/${encodeURIComponent(orderUuid.value)}`),
  { watch: [orderUuid] },
)

const { data: timeline } = await useAsyncData(
  'store-order-timeline',
  () =>
    requestFetch<{ events: TimelineEvent[] }>(
      `/api/store/orders/${encodeURIComponent(orderUuid.value)}/timeline`,
    ),
  { watch: [orderUuid] },
)

function statusLabel(s: string) {
  if (s === 'paid') return '已付款'
  if (s === 'pending_payment') return '待付款'
  if (s === 'payment_failed') return '付款失敗'
  if (s === 'shipping') return '運送中'
  if (s === 'signed') return '已簽收'
  return s
}

function eventLabel(type: string) {
  if (type === 'order_created') return '訂單建立'
  if (type === 'payment_confirmed') return '付款完成'
  if (type === 'payment_failed') return '付款失敗'
  if (type === 'shipping_started') return '開始運送'
  if (type === 'delivered_signed') return '已簽收'
  if (type === 'customer_info_updated') return '收件資料已更新'
  return type
}

function eventDotClass(type: string) {
  if (type === 'payment_confirmed') return 'bg-emerald-500'
  if (type === 'shipping_started') return 'bg-blue-500'
  if (type === 'delivered_signed') return 'bg-violet-500'
  if (type === 'payment_failed') return 'bg-red-500'
  if (type === 'customer_info_updated') return 'bg-amber-500'
  return 'bg-neutral-400'
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
            class="block rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            我的資料
          </NuxtLink>
          <NuxtLink
            to="/profile/orders"
            class="block rounded-md bg-neutral-900 px-3 py-2 text-sm text-white"
          >
            我的訂單
          </NuxtLink>
        </nav>
      </aside>

      <section>
        <NuxtLink to="/profile/orders" class="text-sm text-neutral-600 underline">← 返回訂單列表</NuxtLink>

        <p v-if="error" class="mt-6 text-sm text-red-600">{{ error.message }}</p>

        <template v-else-if="data">
          <h1 class="mt-4 text-2xl font-semibold tracking-tight text-neutral-900">訂單 {{ data.order.orderUuid }}</h1>
          <p class="mt-2 text-sm text-neutral-600">
            狀態：{{ statusLabel(data.order.status) }} · 建立時間：{{ new Date(data.order.createdAt).toLocaleString() }}
          </p>
          <p class="mt-1 text-sm text-neutral-600">
            付款方式：{{ data.order.paymentProvider || '-' }} · Email：{{ data.order.customerEmail || '-' }}
          </p>
          <div class="mt-4">
            <NuxtLink
              :to="`/invoices/${data.order.orderUuid}`"
              class="inline-flex rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-800 hover:bg-neutral-50"
            >
              查看統一發票頁
            </NuxtLink>
          </div>

          <ul class="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200 bg-white">
            <li v-for="line in data.order.lines" :key="line.id" class="px-4 py-4">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <p class="text-sm font-medium text-neutral-900">{{ line.title }}</p>
                  <p class="mt-1 text-xs text-neutral-500">SKU: {{ line.sku }} · 數量: {{ line.quantity }}</p>
                </div>
                <div class="text-right">
                  <p class="text-xs text-neutral-500">{{ formatHkd(line.unitPrice) }} × {{ line.quantity }}</p>
                  <p class="text-sm font-semibold text-neutral-900">{{ formatHkd(line.lineTotal) }}</p>
                </div>
              </div>
            </li>
          </ul>

          <div class="mt-6 rounded-lg border border-neutral-200 bg-white p-4 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-neutral-600">小計</span>
              <span class="font-medium text-neutral-900">{{ formatHkd(data.order.subtotal) }}</span>
            </div>
            <div class="mt-2 flex items-center justify-between border-t border-neutral-100 pt-2">
              <span class="text-neutral-600">總計</span>
              <span class="text-base font-semibold text-neutral-900">{{ formatHkd(data.order.total) }}</span>
            </div>
          </div>

          <section class="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
            <h2 class="text-base font-semibold text-neutral-900">
              訂單進度
            </h2>
            <ul class="mt-3">
              <li
                v-for="item in timeline?.events || []"
                :key="item.id"
                class="relative pl-8 pb-4 last:pb-0"
              >
                <span
                  class="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full"
                  :class="eventDotClass(item.eventType)"
                />
                <span
                  class="absolute left-[4px] top-4 bottom-0 w-px bg-neutral-200"
                  aria-hidden="true"
                />
                <div class="rounded-md border border-neutral-200 bg-white px-3 py-2">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-sm font-medium text-neutral-900">
                      {{ eventLabel(item.eventType) }}
                    </p>
                    <p class="text-xs text-neutral-500">
                      {{ new Date(item.eventAt).toLocaleString('zh-HK') }}
                    </p>
                  </div>
                  <p v-if="item.note" class="mt-1 text-xs text-neutral-600">
                    {{ item.note }}
                  </p>
                </div>
              </li>
              <li
                v-if="!(timeline?.events || []).length"
                class="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-sm text-neutral-500"
              >
                尚無可顯示的進度紀錄
              </li>
            </ul>
          </section>
        </template>
      </section>
    </div>
  </div>
</template>
