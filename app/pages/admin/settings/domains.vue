<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

type CustomDomainItem = {
  id: string
  hostname: string
  verifiedAt: string | null
  createdAt: string
}

type ListResponse = {
  items: CustomDomainItem[]
}

type CreateResponse = {
  id: string
  hostname: string
  verifiedAt: null
  verificationToken: string
}

const requestFetch = useRequestFetch()
const route = useRoute()

const { data, refresh, error, pending } = await useAsyncData(
  'admin-custom-domains',
  async () => {
    return await requestFetch<ListResponse>('/api/admin/custom-domains', {
      credentials: 'include',
    })
  },
)

const loadErrMessage = computed(() => {
  const e = error.value as
    | { data?: { message?: string }; message?: string }
    | null
    | undefined
  return e?.data?.message || e?.message || '無法載入自訂網域。'
})

function tabClass(path: string): string {
  const active = route.path === path
  return active
    ? 'rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white'
    : 'rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50'
}

const newHostname = ref('')
const adding = ref(false)
const addErr = ref<string | null>(null)
/** 新增成功後顯示 DNS 指示（token 僅此時可看見） */
const dnsHint = ref<{
  id: string
  hostname: string
  verificationToken: string
} | null>(null)

const actionErr = ref<string | null>(null)
const actionOk = ref<string | null>(null)
const busyId = ref<string | null>(null)

function errMessage(e: unknown): string {
  const x = e as { data?: { message?: string }; message?: string }
  return x?.data?.message || x?.message || '操作失敗'
}

async function addDomain() {
  adding.value = true
  addErr.value = null
  actionErr.value = null
  actionOk.value = null
  const hostname = newHostname.value.trim()
  if (!hostname) {
    addErr.value = '請輸入網域名稱'
    adding.value = false
    return
  }
  try {
    const res = await $fetch<CreateResponse>('/api/admin/custom-domains', {
      method: 'POST',
      credentials: 'include',
      body: { hostname },
    })
    newHostname.value = ''
    dnsHint.value = {
      id: res.id,
      hostname: res.hostname,
      verificationToken: res.verificationToken,
    }
    actionOk.value = '已新增，請依下方說明完成 DNS 驗證。'
    await refresh()
  } catch (e: unknown) {
    addErr.value = errMessage(e)
  } finally {
    adding.value = false
  }
}

async function verifyDomain(id: string) {
  busyId.value = id
  actionErr.value = null
  actionOk.value = null
  try {
    const res = await $fetch<{ ok: boolean; alreadyVerified?: boolean; verifiedAt?: string }>(
      `/api/admin/custom-domains/${id}/verify`,
      { method: 'POST', credentials: 'include' },
    )
    if (res.alreadyVerified) {
      actionOk.value = '此網域先前已完成驗證。'
    } else {
      actionOk.value = '驗證成功，網域已生效。'
    }
    if (dnsHint.value?.id === id) {
      dnsHint.value = null
    }
    await refresh()
  } catch (e: unknown) {
    actionErr.value = errMessage(e)
  } finally {
    busyId.value = null
  }
}

async function removeDomain(id: string) {
  if (!window.confirm('確定要移除此自訂網域？已驗證的網址將無法再指向本商店。')) {
    return
  }
  busyId.value = id
  actionErr.value = null
  actionOk.value = null
  try {
    await $fetch(`/api/admin/custom-domains/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    if (dnsHint.value?.id === id) {
      dnsHint.value = null
    }
    actionOk.value = '已移除。'
    await refresh()
  } catch (e: unknown) {
    actionErr.value = errMessage(e)
  } finally {
    busyId.value = null
  }
}

const txtRecordName = computed(() =>
  dnsHint.value ? `_oshop-verify.${dnsHint.value.hostname}` : '',
)

async function copyToken() {
  if (!dnsHint.value || !import.meta.client) return
  try {
    await navigator.clipboard.writeText(dnsHint.value.verificationToken)
    actionOk.value = '驗證碼已複製到剪貼簿。'
  } catch {
    actionErr.value = '無法複製，請手動選取驗證碼。'
  }
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('zh-Hant', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}
</script>

<template>
  <div class="max-w-4xl space-y-8">
    <div class="space-y-4">
      <div>
        <h1 class="text-xl font-semibold tracking-tight">
          自訂網域
        </h1>
        <p class="mt-2 text-sm text-neutral-600">
          綁定自有網域後，顧客可用你的網址造訪商店。需在 DNS 新增驗證用 TXT 記錄；通過驗證後系統才會以此
          Host 解析本店。請一併在反向代理或 CDN 設定 TLS 與轉發。
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2 border-b border-neutral-200 pb-3">
        <NuxtLink to="/admin/settings" :class="tabClass('/admin/settings')">
          商店設定
        </NuxtLink>
        <NuxtLink to="/admin/settings/payment" :class="tabClass('/admin/settings/payment')">
          收款設定
        </NuxtLink>
        <NuxtLink to="/admin/settings/shipping" :class="tabClass('/admin/settings/shipping')">
          運送設定
        </NuxtLink>
        <NuxtLink to="/admin/settings/domains" :class="tabClass('/admin/settings/domains')">
          自訂網域
        </NuxtLink>
      </div>
    </div>

    <p v-if="error" class="text-sm text-red-600">
      {{ loadErrMessage }}
    </p>

    <template v-else>
      <p v-if="actionErr" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {{ actionErr }}
      </p>
      <p v-if="actionOk" class="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
        {{ actionOk }}
      </p>

      <section
        v-if="dnsHint"
        class="rounded-lg border border-amber-200 bg-amber-50/80 p-5 shadow-sm space-y-3"
      >
        <h2 class="text-sm font-semibold text-amber-950">
          DNS 驗證（請在完成後點「檢查驗證」）
        </h2>
        <p class="text-xs text-amber-900/90">
          在 DNS 管理後台新增一筆 <strong>TXT</strong> 記錄：
        </p>
        <dl class="grid gap-2 text-xs sm:grid-cols-[7rem_1fr] sm:gap-x-3">
          <dt class="font-medium text-amber-900">
            名稱／主機
          </dt>
          <dd class="break-all font-mono text-amber-950">
            {{ txtRecordName }}
          </dd>
          <dt class="font-medium text-amber-900">
            值
          </dt>
          <dd class="flex flex-wrap items-center gap-2">
            <code class="break-all rounded bg-white/80 px-2 py-1 text-[0.7rem] text-neutral-900 ring-1 ring-amber-200/80">
              {{ dnsHint.verificationToken }}
            </code>
            <button
              type="button"
              class="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 hover:bg-amber-100"
              @click="copyToken"
            >
              複製驗證碼
            </button>
          </dd>
        </dl>
        <div class="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            :disabled="busyId === dnsHint.id"
            @click="verifyDomain(dnsHint.id)"
          >
            檢查驗證
          </button>
          <button
            type="button"
            class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            @click="dnsHint = null"
          >
            稍後再驗證
          </button>
        </div>
      </section>

      <section class="rounded-lg border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
        <h2 class="text-sm font-semibold text-neutral-900">
          新增網域
        </h2>
        <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="addDomain">
          <div class="min-w-0 flex-1">
            <label class="block text-xs font-medium text-neutral-600">
              網域名稱（例：shop.example.com）
            </label>
            <input
              v-model="newHostname"
              type="text"
              autocomplete="off"
              placeholder="your-store.com"
              class="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none ring-neutral-400 focus:ring-2"
            >
          </div>
          <button
            type="submit"
            class="shrink-0 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
            :disabled="adding"
          >
            {{ adding ? '新增中…' : '新增' }}
          </button>
        </form>
        <p v-if="addErr" class="text-sm text-red-600">
          {{ addErr }}
        </p>
      </section>

      <section class="rounded-lg border border-neutral-200 bg-white shadow-sm overflow-hidden">
        <div class="border-b border-neutral-200 px-5 py-3">
          <h2 class="text-sm font-semibold text-neutral-900">
            已設定網域
          </h2>
        </div>
        <div v-if="pending" class="px-5 py-8 text-center text-sm text-neutral-500">
          載入中…
        </div>
        <div
          v-else-if="!data?.items?.length"
          class="px-5 py-8 text-center text-sm text-neutral-500"
        >
          尚未新增自訂網域。
        </div>
        <ul v-else class="divide-y divide-neutral-100">
          <li
            v-for="row in data.items"
            :key="row.id"
            class="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div class="min-w-0">
              <p class="font-mono text-sm font-medium text-neutral-900">
                {{ row.hostname }}
              </p>
              <p class="mt-1 text-xs text-neutral-500">
                新增於 {{ formatTime(row.createdAt) }}
                <span v-if="row.verifiedAt">
                  · 已驗證 {{ formatTime(row.verifiedAt) }}
                </span>
              </p>
              <p v-if="!row.verifiedAt" class="mt-1 text-xs font-medium text-amber-700">
                等待 DNS 驗證
              </p>
            </div>
            <div class="flex shrink-0 flex-wrap gap-2">
              <button
                v-if="!row.verifiedAt"
                type="button"
                class="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                :disabled="busyId !== null"
                @click="verifyDomain(row.id)"
              >
                檢查驗證
              </button>
              <span
                v-else
                class="inline-flex items-center rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"
              >
                已驗證
              </span>
              <button
                type="button"
                class="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                :disabled="busyId !== null"
                @click="removeDomain(row.id)"
              >
                移除
              </button>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>
