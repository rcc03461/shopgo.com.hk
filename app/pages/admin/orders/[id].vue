<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const route = useRoute()
const id = computed(() => String(route.params.id))

type Line = {
  id: string
  productId: string
  productVariantId: string | null
  titleSnapshot: string
  skuSnapshot: string
  unitPrice: string
  quantity: number
  lineTotal: string
}

type Detail = {
  order: {
    id: string
    invoicePublicId: string
    status: string
    paymentProvider: string | null
    paymentReference: string | null
    currency: string
    subtotal: string
    total: string
    customerEmail: string | null
    shippingData: Record<string, unknown> | null
    createdAt: string
    updatedAt: string
  }
  lines: Line[]
}

type TimelineEvent = {
  id: string
  eventType: string
  actorType: string
  actorId: string | null
  source: string
  note: string | null
  metadata: Record<string, unknown>
  eventAt: string
}

type TimelineChange = {
  id: string
  fieldName: string
  oldValue: string | null
  newValue: string | null
  actorType: string
  actorId: string | null
  reason: string | null
  changedAt: string
}

type TimelineResponse = {
  events: TimelineEvent[]
  changes: TimelineChange[]
}

type OrderStatus =
  | 'pending_payment'
  | 'paid'
  | 'payment_failed'
  | 'shipping'
  | 'signed'

const ORDER_STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'pending_payment', label: '待付款' },
  { value: 'paid', label: '已付款' },
  { value: 'payment_failed', label: '付款失敗' },
  { value: 'shipping', label: '運送中' },
  { value: 'signed', label: '已簽收' },
]

const requestFetch = useRequestFetch()

const { data, error, refresh } = await useAsyncData(
  () => `admin-order-detail-${id.value}`,
  async () => {
    return await requestFetch<Detail>(`/api/admin/orders/${id.value}`, {
      credentials: 'include',
    })
  },
  { watch: [id] },
)

const { data: timeline, refresh: refreshTimeline } = await useAsyncData(
  () => `admin-order-timeline-${id.value}`,
  async () => {
    return await requestFetch<TimelineResponse>(`/api/admin/orders/${id.value}/timeline`, {
      credentials: 'include',
    })
  },
  { watch: [id] },
)

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('zh-HK')
  } catch {
    return iso
  }
}

function formatMoney(amount: string, currency: string) {
  const n = Number(amount)
  if (Number.isNaN(n)) return amount
  try {
    return new Intl.NumberFormat('zh-HK', {
      style: 'currency',
      currency: currency || 'HKD',
    }).format(n)
  } catch {
    return `${amount} ${currency}`
  }
}

function statusLabel(s: string) {
  if (s === 'paid') return '已付款'
  if (s === 'pending_payment') return '待付款'
  if (s === 'payment_failed') return '付款失敗'
  if (s === 'shipping') return '運送中'
  if (s === 'signed') return '已簽收'
  return s
}

function statusPillClass(s: string) {
  if (s === 'paid') return 'bg-emerald-50 text-emerald-800 ring-emerald-200'
  if (s === 'pending_payment') return 'bg-amber-50 text-amber-900 ring-amber-200'
  if (s === 'payment_failed') return 'bg-red-50 text-red-800 ring-red-200'
  if (s === 'shipping') return 'bg-blue-50 text-blue-800 ring-blue-200'
  if (s === 'signed') return 'bg-violet-50 text-violet-800 ring-violet-200'
  return 'bg-neutral-100 text-neutral-800 ring-neutral-200'
}

function providerLabel(p: string | null) {
  if (!p) return '—'
  if (p === 'stripe') return 'Stripe'
  if (p === 'paypal') return 'PayPal'
  return p
}

function eventLabel(type: string) {
  if (type === 'order_created') return '訂單建立'
  if (type === 'payment_confirmed') return '付款完成'
  if (type === 'payment_failed') return '付款失敗'
  if (type === 'shipping_started') return '開始運送'
  if (type === 'delivered_signed') return '已簽收'
  if (type === 'customer_info_updated') return '客戶資料已更新'
  return type
}

function actorLabel(type: string) {
  if (type === 'admin') return '管理員'
  if (type === 'customer') return '客戶'
  return '系統'
}

function eventDotClass(type: string) {
  if (type === 'payment_confirmed') return 'bg-emerald-500'
  if (type === 'shipping_started') return 'bg-blue-500'
  if (type === 'delivered_signed') return 'bg-violet-500'
  if (type === 'payment_failed') return 'bg-red-500'
  if (type === 'customer_info_updated') return 'bg-amber-500'
  return 'bg-neutral-400'
}

function shippingField(v: unknown) {
  return typeof v === 'string' && v.trim() ? v.trim() : '—'
}

const statusDraft = ref<OrderStatus>('pending_payment')
const savingStatus = ref(false)
const saveStatusErr = ref<string | null>(null)
const saveStatusOk = ref(false)
const customerEmailDraft = ref('')
const shippingNameDraft = ref('')
const shippingPhoneDraft = ref('')
const shippingAddressDraft = ref('')
const shippingRemarksDraft = ref('')
const changeReasonDraft = ref('')
const savingProfile = ref(false)
const saveProfileErr = ref<string | null>(null)
const saveProfileOk = ref(false)
const showProfileDrawer = ref(false)

function isOrderStatus(v: string): v is OrderStatus {
  return ORDER_STATUS_OPTIONS.some((option) => option.value === v)
}

watch(
  () => data.value?.order.status,
  (v) => {
    if (!v) return
    if (isOrderStatus(v)) {
      statusDraft.value = v
    }
  },
  { immediate: true },
)

watch(
  () => data.value?.order,
  (order) => {
    if (!order) return
    customerEmailDraft.value = order.customerEmail ?? ''
    shippingNameDraft.value =
      typeof order.shippingData?.name === 'string' ? order.shippingData.name : ''
    shippingPhoneDraft.value =
      typeof order.shippingData?.phone === 'string' ? order.shippingData.phone : ''
    shippingAddressDraft.value =
      typeof order.shippingData?.address === 'string' ? order.shippingData.address : ''
    shippingRemarksDraft.value =
      typeof order.shippingData?.remarks === 'string' ? order.shippingData.remarks : ''
  },
  { immediate: true },
)

async function saveStatus() {
  if (!data.value) return
  savingStatus.value = true
  saveStatusErr.value = null
  saveStatusOk.value = false
  try {
    await $fetch(`/api/admin/orders/${data.value.order.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: { status: statusDraft.value, note: '管理員手動更新狀態' },
    })
    await refresh()
    await refreshTimeline()
    saveStatusOk.value = true
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    saveStatusErr.value = x?.data?.message || x?.message || '更新狀態失敗'
  } finally {
    savingStatus.value = false
  }
}

async function saveCustomerProfile() {
  if (!data.value) return
  savingProfile.value = true
  saveProfileErr.value = null
  saveProfileOk.value = false
  try {
    const shippingData = {
      ...(data.value.order.shippingData ?? {}),
      name: shippingNameDraft.value.trim() || undefined,
      phone: shippingPhoneDraft.value.trim() || undefined,
      address: shippingAddressDraft.value.trim() || undefined,
      remarks: shippingRemarksDraft.value.trim() || undefined,
    }
    await $fetch(`/api/admin/orders/${data.value.order.id}`, {
      method: 'PATCH',
      credentials: 'include',
      body: {
        customerEmail: customerEmailDraft.value.trim() || null,
        shippingData,
        changeReason: changeReasonDraft.value.trim() || '管理員修正客戶資料',
        note: '客戶資料更新',
      },
    })
    await refresh()
    await refreshTimeline()
    saveProfileOk.value = true
  } catch (e: unknown) {
    const x = e as { data?: { message?: string }; message?: string }
    saveProfileErr.value = x?.data?.message || x?.message || '更新客戶資料失敗'
  } finally {
    savingProfile.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-3">
      <NuxtLink
        to="/admin/orders"
        class="text-sm text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
      >
        ← 返回訂單列表
      </NuxtLink>
    </div>

    <p v-if="error" class="mt-6 text-sm text-red-600">
      無法載入訂單（可能不存在或無權限）。
    </p>

    <template v-else-if="data">
      <div class="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold tracking-tight">
            訂單詳情
          </h1>
          <p class="mt-1 font-mono text-xs text-neutral-500">
            {{ data.order.id }}
          </p>
        </div>
        <span
          class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset"
          :class="statusPillClass(data.order.status)"
        >
          {{ statusLabel(data.order.status) }}
        </span>
      </div>

      <dl
        class="mt-8 grid gap-6 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            建立時間
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ formatTime(data.order.createdAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            最後更新
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ formatTime(data.order.updatedAt) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            發票公開 ID
          </dt>
          <dd class="mt-1 break-all font-mono text-sm text-neutral-900">
            {{ data.order.invoicePublicId }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            顧客電郵
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ data.order.customerEmail || '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            收款方式
          </dt>
          <dd class="mt-1 text-sm text-neutral-900">
            {{ providerLabel(data.order.paymentProvider) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            外部參考
          </dt>
          <dd class="mt-1 break-all font-mono text-xs text-neutral-800">
            {{ data.order.paymentReference || '—' }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            小計
          </dt>
          <dd class="mt-1 text-sm font-medium text-neutral-900">
            {{ formatMoney(data.order.subtotal, data.order.currency) }}
          </dd>
        </div>
        <div>
          <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
            總計
          </dt>
          <dd class="mt-1 text-lg font-semibold text-neutral-900">
            {{ formatMoney(data.order.total, data.order.currency) }}
          </dd>
        </div>
      </dl>

      <section
        v-if="data.order.shippingData"
        class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-base font-semibold text-neutral-900">
            運送資料
          </h2>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            title="編輯客戶資料"
            aria-label="編輯客戶資料"
            @click="showProfileDrawer = true"
          >
            <svg
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
            </svg>
          </button>
        </div>
        <dl class="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              運送方式
            </dt>
            <dd class="mt-1 text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.method) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              收件人
            </dt>
            <dd class="mt-1 text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.name) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              運送 Email
            </dt>
            <dd class="mt-1 text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.email) }}
            </dd>
          </div>
          <div>
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              電話
            </dt>
            <dd class="mt-1 text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.phone) }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              地址
            </dt>
            <dd class="mt-1 whitespace-pre-line text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.address) }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-xs font-medium uppercase tracking-wide text-neutral-500">
              備註
            </dt>
            <dd class="mt-1 whitespace-pre-line text-sm text-neutral-900">
              {{ shippingField(data.order.shippingData.remarks) }}
            </dd>
          </div>
        </dl>
      </section>

      <section class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-semibold text-neutral-900">
          訂單狀態
        </h2>
        <p class="mt-1 text-sm text-neutral-600">
          可手動修正狀態（例如線下確認收款）。
        </p>
        <p
          v-if="saveStatusErr"
          class="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ saveStatusErr }}
        </p>
        <p
          v-if="saveStatusOk"
          class="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          訂單狀態已更新。
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-3">
          <select
            v-model="statusDraft"
            class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option
              v-for="option in ORDER_STATUS_OPTIONS"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <button
            type="button"
            :disabled="savingStatus || statusDraft === data.order.status"
            class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            @click="saveStatus"
          >
            {{ savingStatus ? '更新中…' : '更新狀態' }}
          </button>
        </div>
      </section>

      <section class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-semibold text-neutral-900">
          流程記錄
        </h2>
        <ul class="mt-4">
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
              <div class="flex flex-wrap items-center justify-between gap-2">
                <p class="text-sm font-medium text-neutral-900">
                  {{ eventLabel(item.eventType) }}
                </p>
                <p class="text-xs text-neutral-500">
                  {{ formatTime(item.eventAt) }}
                </p>
              </div>
              <p class="mt-1 text-xs text-neutral-600">
                來源：{{ actorLabel(item.actorType) }} / {{ item.source }}
              </p>
              <p v-if="item.note" class="mt-1 text-xs text-neutral-600">
                備註：{{ item.note }}
              </p>
            </div>
          </li>
          <li
            v-if="!(timeline?.events || []).length"
            class="rounded-md border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500"
          >
            尚無流程記錄
          </li>
        </ul>
      </section>

      <section class="mt-8 rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 class="text-base font-semibold text-neutral-900">
          資料異動紀錄
        </h2>
        <div class="mt-4 overflow-x-auto">
          <table class="min-w-full divide-y divide-neutral-200 text-sm">
            <thead class="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
              <tr>
                <th class="px-3 py-2">
                  時間
                </th>
                <th class="px-3 py-2">
                  欄位
                </th>
                <th class="px-3 py-2">
                  舊值
                </th>
                <th class="px-3 py-2">
                  新值
                </th>
                <th class="px-3 py-2">
                  原因
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-neutral-200">
              <tr v-for="item in timeline?.changes || []" :key="item.id">
                <td class="whitespace-nowrap px-3 py-2 text-xs text-neutral-600">
                  {{ formatTime(item.changedAt) }}
                </td>
                <td class="px-3 py-2 font-mono text-xs text-neutral-800">
                  {{ item.fieldName }}
                </td>
                <td class="px-3 py-2 text-xs text-neutral-700">
                  {{ item.oldValue || '—' }}
                </td>
                <td class="px-3 py-2 text-xs text-neutral-900">
                  {{ item.newValue || '—' }}
                </td>
                <td class="px-3 py-2 text-xs text-neutral-700">
                  {{ item.reason || '—' }}
                </td>
              </tr>
              <tr v-if="!(timeline?.changes || []).length">
                <td colspan="5" class="px-3 py-4 text-center text-sm text-neutral-500">
                  尚無資料異動紀錄
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="mt-8">
        <h2 class="text-base font-semibold text-neutral-900">
          明細
        </h2>
        <div
          class="mt-3 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm"
        >
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-neutral-200 text-sm">
              <thead class="bg-neutral-50 text-left text-xs font-medium uppercase tracking-wide text-neutral-500">
                <tr>
                  <th class="px-4 py-3">
                    品項
                  </th>
                  <th class="px-4 py-3">
                    SKU
                  </th>
                  <th class="whitespace-nowrap px-4 py-3 text-right">
                    單價
                  </th>
                  <th class="whitespace-nowrap px-4 py-3 text-right">
                    數量
                  </th>
                  <th class="whitespace-nowrap px-4 py-3 text-right">
                    小計
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-neutral-200">
                <tr v-if="!data.lines.length">
                  <td colspan="5" class="px-4 py-6 text-center text-neutral-500">
                    無明細
                  </td>
                </tr>
                <tr
                  v-for="line in data.lines"
                  :key="line.id"
                  class="hover:bg-neutral-50"
                >
                  <td class="px-4 py-3 font-medium text-neutral-900">
                    {{ line.titleSnapshot }}
                  </td>
                  <td class="px-4 py-3 font-mono text-xs text-neutral-700">
                    {{ line.skuSnapshot }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-right text-neutral-700">
                    {{ formatMoney(line.unitPrice, data.order.currency) }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-right text-neutral-700">
                    {{ line.quantity }}
                  </td>
                  <td class="whitespace-nowrap px-4 py-3 text-right font-medium text-neutral-900">
                    {{ formatMoney(line.lineTotal, data.order.currency) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </template>

    <div
      v-if="showProfileDrawer"
      class="fixed inset-0 z-40"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        class="absolute inset-0 bg-black/30"
        aria-label="關閉抽屜"
        @click="showProfileDrawer = false"
      />
      <aside
        class="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto border-l border-neutral-200 bg-white p-6 shadow-xl"
      >
        <div class="flex items-center justify-between gap-3">
          <h2 class="text-lg font-semibold text-neutral-900">
            客戶資料修正
          </h2>
          <button
            type="button"
            class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
            @click="showProfileDrawer = false"
          >
            關閉
          </button>
        </div>

        <p
          v-if="saveProfileErr"
          class="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {{ saveProfileErr }}
        </p>
        <p
          v-if="saveProfileOk"
          class="mt-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
        >
          客戶資料已更新，並寫入歷史紀錄。
        </p>

        <div class="mt-4 grid gap-3 sm:grid-cols-2">
          <label class="text-sm text-neutral-700">
            客戶 Email
            <input
              v-model="customerEmailDraft"
              type="email"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            >
          </label>
          <label class="text-sm text-neutral-700">
            收件人
            <input
              v-model="shippingNameDraft"
              type="text"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            >
          </label>
          <label class="text-sm text-neutral-700">
            聯絡電話
            <input
              v-model="shippingPhoneDraft"
              type="text"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            >
          </label>
          <label class="text-sm text-neutral-700 sm:col-span-2">
            地址
            <textarea
              v-model="shippingAddressDraft"
              rows="2"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label class="text-sm text-neutral-700 sm:col-span-2">
            備註
            <textarea
              v-model="shippingRemarksDraft"
              rows="2"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            />
          </label>
          <label class="text-sm text-neutral-700 sm:col-span-2">
            修改原因（審計用途）
            <input
              v-model="changeReasonDraft"
              type="text"
              placeholder="例如：客戶來電更正電話號碼"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2"
            >
          </label>
        </div>
        <div class="mt-6 flex items-center gap-3">
          <button
            type="button"
            :disabled="savingProfile"
            class="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            @click="saveCustomerProfile"
          >
            {{ savingProfile ? '更新中…' : '更新客戶資料' }}
          </button>
          <button
            type="button"
            class="rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            @click="showProfileDrawer = false"
          >
            取消
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>
