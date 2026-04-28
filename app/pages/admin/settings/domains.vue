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
const config = useRuntimeConfig()

const saasCnameTarget = computed(() =>
  String(config.public.saasCnameTarget || '').trim(),
)
const saasSupportDocUrl = computed(() =>
  String(config.public.saasSupportDocUrl || '').trim(),
)

function txtHostFor(hostname: string): string {
  return `_oshop-verify.${hostname}`
}

async function copyPlainText(text: string, okMsg: string) {
  if (!import.meta.client) return
  try {
    await navigator.clipboard.writeText(text)
    actionOk.value = okMsg
    actionErr.value = null
  } catch {
    actionErr.value = '無法複製到剪貼簿，請手動選取。'
  }
}

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
  await copyPlainText(dnsHint.value.verificationToken, '驗證碼已複製到剪貼簿。')
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
          完成下方步驟後，顧客可用你的網址造訪商店。請依序處理：<strong>流量導向（CNAME）</strong>、
          <strong>HTTPS 憑證</strong>（若平台使用 Cloudflare for SaaS）、以及 <strong>本頁的商店歸屬驗證（TXT）</strong>——三層都完成，網址與 HTTPS 才會正常。
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

    <details
      open
      class="rounded-lg border border-sky-200 bg-sky-50/60 shadow-sm"
    >
      <summary
        class="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-sky-950 [&::-webkit-details-marker]:hidden"
      >
        <span class="underline decoration-dotted">操作指引（請依序完成）</span>
        <span class="ml-2 text-xs font-normal text-sky-800/90">展開／收合</span>
      </summary>
      <div class="space-y-4 border-t border-sky-200/80 px-4 pb-4 pt-3 text-sm text-sky-950">
        <p
          v-if="saasSupportDocUrl"
          class="text-xs"
        >
          更多說明：
          <a
            :href="saasSupportDocUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-sky-800 underline hover:text-sky-950"
          >開啟平台說明</a>
        </p>

        <ol class="list-decimal space-y-3 pl-5 text-sm leading-relaxed">
          <li>
            <strong>流量導向（必做）</strong>：在網域 DNS 新增
            <strong>CNAME</strong>，將你要用的前綴（例：
            <code class="rounded bg-white/80 px-1 py-0.5 text-xs">shop</code>
            → 即完整網址
            <code class="rounded bg-white/80 px-1 py-0.5 text-xs">shop.你的網域</code>
            ）指向下方顯示的<strong>主機名</strong>。
            <br>
            <span class="mt-1 block text-xs text-sky-900/85">
              這個主機名在 Cloudflare 後台叫做 <strong>Fallback Origin</strong>（與首頁
              <code class="rounded bg-white/60 px-0.5">shopgo.com.hk</code>
              無關）。平台會把它設成環境變數並顯示在此；若你仍是錯誤的 CNAME 目標，可能出現
              <strong>1001</strong>。
            </span>
            <template v-if="saasCnameTarget">
              <br>
              <span class="mt-1 inline-block text-xs font-medium">租戶 CNAME「目標／指向」請填：</span>
              <code class="mt-0.5 block w-fit break-all rounded bg-white px-2 py-1 text-xs ring-1 ring-sky-200">{{ saasCnameTarget }}</code>
              <button
                type="button"
                class="mt-1 text-xs text-sky-800 underline hover:text-sky-950"
                @click="copyPlainText(saasCnameTarget, 'CNAME 目標已複製。')"
              >
                複製主機名
              </button>
            </template>
            <template v-else>
              <span class="mt-1 block text-xs text-sky-900/90">
                平台尚未設定顯示值。請向客服索取與 Cloudflare
                <strong>Fallback Origin</strong>
                相同的那一串主機名（例
                <code class="rounded bg-white/60 px-0.5">origin.shopgo.com.hk</code>），
                並請平台在部署環境設定
                <code class="rounded bg-white/60 px-0.5">NUXT_PUBLIC_SAAS_CNAME_TARGET</code>。
              </span>
            </template>
          </li>
          <li>
            <strong>HTTPS 憑證（Cloudflare for SaaS / DCV）</strong>：除上面的流量 CNAME 外，通常還要另一筆
            <strong>CNAME</strong>，主機名多為
            <code class="rounded bg-white/80 px-1 text-xs">_acme-challenge.shop</code>
            （或完整
            <code class="rounded bg-white/80 px-1 text-xs">_acme-challenge.shop.你的網域</code>
            ），目標為 Cloudflare 畫面上<strong>專用驗證網址</strong>（常含
            <code class="rounded bg-white/80 px-1 text-xs">.dcv.cloudflare.com</code>，
            以 Custom Hostname 詳情為準）。<strong>與流量 CNAME 不同：不要把你整個 shop 子網域指到 dcv 那串。</strong>
          </li>
          <li>
            <strong>商店歸屬（必做）</strong>：於下方「新增網域」送出後，依畫面上黃色區塊新增
            <strong>TXT</strong>
            <code class="rounded bg-white/80 px-1 text-xs">_oshop-verify.你的完整網域</code>
            ，再按「檢查驗證」。通過後本系統才會把此網域對應到你的商店。
          </li>
          <li>
            每完成一類 DNS 變更後，傳播可能需要數分鐘至數小時；可稍候再按「檢查驗證」。
          </li>
        </ol>

        <div class="rounded-md bg-white/70 px-3 py-2 text-xs text-sky-900 ring-1 ring-sky-200/70">
          <strong>常見問題：</strong>
          「已驗證」僅代表本系統已確認 TXT；
          若瀏覽器仍無法開啟 HTTPS，請確認步驟 1、2 已在 DNS 生效。
          若遺失 TXT 驗證碼，請「移除」該網域後重新新增，會產生新的驗證碼。
        </div>
      </div>
    </details>

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
          步驟 3：本系統商店歸屬驗證（TXT）
        </h2>
        <p class="text-xs text-amber-900/95 leading-relaxed">
          請在 DNS 新增下列 <strong>TXT</strong>。完成後按「檢查驗證」。
          若尚未做<strong> CNAME 流量導向</strong>與<strong> HTTPS（_acme-challenge）</strong>，請先依上方「操作指引」處理，否則網站可能仍無法連線或無憑證。
        </p>
        <p class="text-xs text-amber-900/90">
          在 DNS 管理後台新增一筆 <strong>TXT</strong> 記錄：
        </p>
        <dl class="grid gap-2 text-xs sm:grid-cols-[7rem_1fr] sm:gap-x-3">
          <dt class="font-medium text-amber-900">
            名稱／主機
          </dt>
          <dd class="flex flex-wrap items-center gap-2 break-all font-mono text-amber-950">
            <span>{{ txtRecordName }}</span>
            <button
              type="button"
              class="rounded-md border border-amber-300 bg-white px-2 py-1 text-xs text-amber-900 hover:bg-amber-100"
              @click="copyPlainText(txtRecordName, 'TXT 名稱已複製。')"
            >
              複製名稱
            </button>
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
        <p class="text-xs text-neutral-600 leading-relaxed">
          請輸入<strong>完整 hostname</strong>（例：<code class="rounded bg-neutral-100 px-1">shop.example.com</code>），勿含
          <code class="rounded bg-neutral-100 px-1">https://</code>。送出後請依黃色區塊完成 TXT，並搭配上方「操作指引」的 CNAME／憑證步驟。
        </p>
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
              <p v-if="!row.verifiedAt" class="mt-2 space-y-1 text-xs text-neutral-600">
                <span class="font-medium text-amber-700">等待 DNS（本系統 TXT）驗證</span>
                <span class="block font-medium text-amber-800">本系統 TXT 名稱：</span>
                <span class="flex flex-wrap items-center gap-2 font-mono text-neutral-800">
                  {{ txtHostFor(row.hostname) }}
                  <button
                    type="button"
                    class="text-sky-700 underline hover:text-sky-900"
                    @click="copyPlainText(txtHostFor(row.hostname), 'TXT 主機名已複製。')"
                  >
                    複製
                  </button>
                </span>
                <span class="block text-neutral-500">
                  驗證碼僅在「新增」成功當下顯示於黃色區塊；若遺失請移除此網域後重新新增。
                </span>
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
