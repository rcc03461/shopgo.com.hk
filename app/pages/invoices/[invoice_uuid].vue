<script setup lang="ts">
import { formatHkd } from '~/utils/formatHkd'

definePageMeta({
  layout: 'default',
})

type InvoiceDetail = {
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

const route = useRoute()
const requestFetch = useRequestFetch()
const invoiceUuid = computed(() => String(route.params.invoice_uuid || ''))

const { data, error } = await useAsyncData(
  () => `store-invoice-${invoiceUuid.value}`,
  () =>
    requestFetch<{ order: InvoiceDetail }>(
      `/api/store/invoices/${encodeURIComponent(invoiceUuid.value)}`,
    ),
  { watch: [invoiceUuid] },
)

function statusLabel(s: string) {
  if (s === 'paid') return '已付款'
  if (s === 'pending_payment') return '待付款'
  if (s === 'payment_failed') return '付款失敗'
  if (s === 'shipping') return '運送中'
  if (s === 'signed') return '已簽收'
  return s
}

function providerLabel(s: string | null) {
  if (!s) return '-'
  if (s === 'stripe') return 'Stripe'
  if (s === 'paypal') return 'PayPal'
  return s
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 py-10 sm:px-6">
    <div class="rounded-lg border border-neutral-200 bg-white p-6">
      <p v-if="error" class="text-sm text-red-600">
        {{ error.message || '無法載入發票資料' }}
      </p>

      <template v-else-if="data">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 class="text-xl font-semibold text-neutral-900">
              訂單發票
            </h1>
            <p class="mt-1 text-xs text-neutral-500">
              發票編號：<span class="font-mono text-neutral-800">{{ data.order.orderUuid }}</span>
            </p>
          </div>
          <span class="rounded bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
            {{ statusLabel(data.order.status) }}
          </span>
        </div>

        <div class="mt-5 grid gap-3 text-sm text-neutral-700 sm:grid-cols-2">
          <p>付款方式：{{ providerLabel(data.order.paymentProvider) }}</p>
          <p>建立時間：{{ new Date(data.order.createdAt).toLocaleString('zh-HK') }}</p>
          <p class="sm:col-span-2">Email：{{ data.order.customerEmail || '-' }}</p>
        </div>

        <ul class="mt-6 divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          <li
            v-for="line in data.order.lines"
            :key="line.id"
            class="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div>
              <p class="text-sm font-medium text-neutral-900">
                {{ line.title }}
              </p>
              <p class="mt-0.5 text-xs text-neutral-500">
                SKU: {{ line.sku }} · 數量: {{ line.quantity }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-xs text-neutral-500">
                {{ formatHkd(line.unitPrice) }} × {{ line.quantity }}
              </p>
              <p class="text-sm font-semibold text-neutral-900">
                {{ formatHkd(line.lineTotal) }}
              </p>
            </div>
          </li>
        </ul>

        <div class="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm">
          <div class="flex items-center justify-between">
            <span class="text-neutral-600">小計</span>
            <span class="font-medium text-neutral-900">{{ formatHkd(data.order.subtotal) }}</span>
          </div>
          <div class="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
            <span class="text-neutral-600">總計</span>
            <span class="text-base font-semibold text-neutral-900">{{ formatHkd(data.order.total) }}</span>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>
