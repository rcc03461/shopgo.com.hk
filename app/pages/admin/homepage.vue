<script setup lang="ts">
import type { HomepageModule } from '~/types/homepage'

definePageMeta({
  layout: 'admin',
})

const requestFetch = useRequestFetch()
const saving = ref(false)
const publishing = ref(false)
const saveError = ref<string | null>(null)
const draftItems = ref<HomepageModule[]>([])

const { data, pending, error, refresh } = await useAsyncData(
  'admin-homepage-modules',
  async () => {
    return await requestFetch<{ items: HomepageModule[]; hasPublished: boolean }>(
      '/api/admin/homepage/modules',
      { credentials: 'include' },
    )
  },
)

watchEffect(() => {
  draftItems.value = (data.value?.items ?? []).map((item) => structuredClone(item))
})

function moveItem(index: number, delta: number) {
  const target = index + delta
  if (target < 0 || target >= draftItems.value.length) return
  const copied = [...draftItems.value]
  const [item] = copied.splice(index, 1)
  if (!item) return
  copied.splice(target, 0, item)
  draftItems.value = copied.map((module, idx) => ({ ...module, sortOrder: idx }))
}

async function saveDraft() {
  saveError.value = null
  saving.value = true
  try {
    const payload = draftItems.value.map((item, idx) => ({ ...item, sortOrder: idx }))
    await $fetch('/api/admin/homepage/modules', {
      method: 'PUT',
      credentials: 'include',
      body: { items: payload },
    })
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err?.data?.message || err?.message || '儲存草稿失敗'
  } finally {
    saving.value = false
  }
}

async function publishDraft() {
  saveError.value = null
  publishing.value = true
  try {
    await $fetch('/api/admin/homepage/modules/publish', {
      method: 'POST',
      credentials: 'include',
    })
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err?.data?.message || err?.message || '發佈失敗'
  } finally {
    publishing.value = false
  }
}

async function resetDraft() {
  saveError.value = null
  saving.value = true
  try {
    await $fetch('/api/admin/homepage/modules/reset-draft', {
      method: 'POST',
      credentials: 'include',
    })
    await refresh()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    saveError.value = err?.data?.message || err?.message || '還原草稿失敗'
  } finally {
    saving.value = false
  }
}

function updateModuleConfig(module: HomepageModule, value: string) {
  try {
    module.config = JSON.parse(value) as HomepageModule['config']
    saveError.value = null
  } catch {
    saveError.value = `模組 ${module.moduleKey} JSON 格式錯誤`
  }
}

function asRecord(module: HomepageModule): Record<string, any> {
  if (!module.config || typeof module.config !== 'object') {
    module.config = {} as HomepageModule['config']
  }
  return module.config as Record<string, any>
}

function ensureBannerConfig(module: HomepageModule) {
  const config = asRecord(module)
  if (!config.hero || typeof config.hero !== 'object') {
    config.hero = {
      badge: '多租戶線上商店',
      title: '',
      subtitle: '',
      primaryCta: { label: '', to: '/' },
      secondaryCta: { label: '', to: '/' },
    }
  }
  return config
}

function ensureFooterConfig(module: HomepageModule) {
  const config = asRecord(module)
  if (typeof config.text !== 'string') config.text = ''
  return config
}

function ensureNavConfig(module: HomepageModule) {
  const config = asRecord(module)
  if (typeof config.show !== 'boolean') config.show = true
  return config
}

function ensureCategoryConfig(module: HomepageModule) {
  const config = asRecord(module)
  if (typeof config.title !== 'string') config.title = ''
  if (!Array.isArray(config.categories)) config.categories = []
  return config
}

function ensureProductsConfig(module: HomepageModule) {
  const config = asRecord(module)
  if (typeof config.title !== 'string') config.title = ''
  if (!Array.isArray(config.categories)) config.categories = []
  if (!Array.isArray(config.products)) config.products = []
  return config
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function addCategoryToModule(module: HomepageModule) {
  const config =
    module.moduleType === 'category' ? ensureCategoryConfig(module) : ensureProductsConfig(module)
  config.categories.push({
    id: createId('cat'),
    label: '新分類',
  })
}

function removeCategoryFromModule(module: HomepageModule, index: number) {
  const config =
    module.moduleType === 'category' ? ensureCategoryConfig(module) : ensureProductsConfig(module)
  config.categories.splice(index, 1)
}

function addProductToModule(module: HomepageModule) {
  if (module.moduleType !== 'products') return
  const config = ensureProductsConfig(module)
  const fallbackCategoryId = config.categories[0]?.id ?? createId('cat')
  if (!config.categories.some((c: any) => c.id === fallbackCategoryId)) {
    config.categories.push({ id: fallbackCategoryId, label: '預設分類' })
  }
  config.products.push({
    id: createId('prd'),
    categoryId: fallbackCategoryId,
    name: '新商品',
    slug: 'new-product',
    priceLabel: 'HK$0',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=800&q=80',
  })
}

function removeProductFromModule(module: HomepageModule, index: number) {
  if (module.moduleType !== 'products') return
  const config = ensureProductsConfig(module)
  config.products.splice(index, 1)
}
</script>

<template>
  <div class="max-w-5xl space-y-4">
    <div>
      <h1 class="text-xl font-semibold tracking-tight">首頁模組</h1>
      <p class="mt-1 text-sm text-neutral-600">
        編輯草稿後按「發佈」才會套用到店舖首頁。可調整模組順序、啟用狀態與設定內容。
      </p>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="saveDraft"
      >
        儲存草稿
      </button>
      <button
        type="button"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="publishDraft"
      >
        發佈
      </button>
      <button
        type="button"
        class="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        :disabled="saving || publishing || pending"
        @click="resetDraft"
      >
        放棄草稿改動
      </button>
      <span class="ml-auto text-xs text-neutral-500">
        已發佈版本：{{ data?.hasPublished ? '有' : '尚未建立' }}
      </span>
    </div>

    <p v-if="saveError" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{{ saveError }}</p>
    <p v-if="error" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">讀取首頁模組失敗，請重整再試。</p>

    <div class="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm">
      <p v-if="pending" class="px-2 py-4 text-sm text-neutral-500">載入中…</p>
      <div v-else class="space-y-3">
        <article
          v-for="(module, index) in draftItems"
          :key="module.moduleKey"
          class="rounded-lg border border-neutral-200 p-4"
        >
          <div class="flex items-center gap-3">
            <div>
              <p class="text-sm font-semibold text-neutral-900">{{ module.moduleType }}</p>
              <p class="text-xs text-neutral-500">{{ module.moduleKey }}</p>
            </div>
            <label class="ml-auto flex items-center gap-2 text-sm text-neutral-700">
              <input v-model="module.isEnabled" type="checkbox" class="h-4 w-4 rounded border-neutral-300">
              啟用
            </label>
            <button
              type="button"
              class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
              @click="moveItem(index, -1)"
            >
              上移
            </button>
            <button
              type="button"
              class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
              @click="moveItem(index, 1)"
            >
              下移
            </button>
          </div>

          <div class="mt-3">
            <template v-if="module.moduleType === 'nav'">
              <label class="flex items-center gap-2 text-sm text-neutral-700">
                <input
                  v-model="ensureNavConfig(module).show"
                  type="checkbox"
                  class="h-4 w-4 rounded border-neutral-300"
                >
                顯示頂部導航列
              </label>
            </template>

            <template v-else-if="module.moduleType === 'banner'">
              <div class="grid gap-3 md:grid-cols-2">
                <label class="text-sm text-neutral-700">
                  <span class="mb-1 block text-xs text-neutral-500">Badge</span>
                  <input
                    v-model="ensureBannerConfig(module).hero.badge"
                    type="text"
                    class="w-full rounded-md border border-neutral-300 px-3 py-2"
                  >
                </label>
                <label class="text-sm text-neutral-700">
                  <span class="mb-1 block text-xs text-neutral-500">主標題</span>
                  <input
                    v-model="ensureBannerConfig(module).hero.title"
                    type="text"
                    class="w-full rounded-md border border-neutral-300 px-3 py-2"
                  >
                </label>
                <label class="text-sm text-neutral-700 md:col-span-2">
                  <span class="mb-1 block text-xs text-neutral-500">副標題</span>
                  <textarea
                    v-model="ensureBannerConfig(module).hero.subtitle"
                    rows="3"
                    class="w-full rounded-md border border-neutral-300 px-3 py-2"
                  />
                </label>
                <label class="text-sm text-neutral-700">
                  <span class="mb-1 block text-xs text-neutral-500">主要 CTA 文字</span>
                  <input
                    v-model="ensureBannerConfig(module).hero.primaryCta.label"
                    type="text"
                    class="w-full rounded-md border border-neutral-300 px-3 py-2"
                  >
                </label>
                <label class="text-sm text-neutral-700">
                  <span class="mb-1 block text-xs text-neutral-500">主要 CTA 連結</span>
                  <input
                    v-model="ensureBannerConfig(module).hero.primaryCta.to"
                    type="text"
                    class="w-full rounded-md border border-neutral-300 px-3 py-2"
                  >
                </label>
              </div>
            </template>

            <template v-else-if="module.moduleType === 'category'">
              <div class="space-y-3">
                <label class="text-sm text-neutral-700">
                  <span class="mb-1 block text-xs text-neutral-500">區塊標題</span>
                  <input
                    v-model="ensureCategoryConfig(module).title"
                    type="text"
                    class="w-full rounded-md border border-neutral-300 px-3 py-2"
                  >
                </label>
                <div class="rounded-md border border-neutral-200 p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <p class="text-xs font-medium text-neutral-500">分類列表</p>
                    <button
                      type="button"
                      class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                      @click="addCategoryToModule(module)"
                    >
                      新增分類
                    </button>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(category, cIdx) in ensureCategoryConfig(module).categories"
                      :key="`cat-${category.id}-${cIdx}`"
                      class="grid gap-2 md:grid-cols-[1fr_2fr_auto]"
                    >
                      <input
                        v-model="category.id"
                        type="text"
                        class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                        placeholder="category id"
                      >
                      <input
                        v-model="category.label"
                        type="text"
                        class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                        placeholder="分類名稱"
                      >
                      <button
                        type="button"
                        class="rounded border border-red-200 px-2 py-1.5 text-xs text-red-700 hover:bg-red-50"
                        @click="removeCategoryFromModule(module, cIdx)"
                      >
                        刪除
                      </button>
                    </div>
                    <p
                      v-if="!ensureCategoryConfig(module).categories.length"
                      class="text-xs text-neutral-500"
                    >
                      尚未設定分類，請先新增至少一個分類。
                    </p>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="module.moduleType === 'products'">
              <div class="space-y-3">
                <label class="text-sm text-neutral-700">
                  <span class="mb-1 block text-xs text-neutral-500">區塊標題</span>
                  <input
                    v-model="ensureProductsConfig(module).title"
                    type="text"
                    class="w-full rounded-md border border-neutral-300 px-3 py-2"
                  >
                </label>

                <div class="rounded-md border border-neutral-200 p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <p class="text-xs font-medium text-neutral-500">分類列表</p>
                    <button
                      type="button"
                      class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                      @click="addCategoryToModule(module)"
                    >
                      新增分類
                    </button>
                  </div>
                  <div class="space-y-2">
                    <div
                      v-for="(category, cIdx) in ensureProductsConfig(module).categories"
                      :key="`prd-cat-${category.id}-${cIdx}`"
                      class="grid gap-2 md:grid-cols-[1fr_2fr_auto]"
                    >
                      <input
                        v-model="category.id"
                        type="text"
                        class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                        placeholder="category id"
                      >
                      <input
                        v-model="category.label"
                        type="text"
                        class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                        placeholder="分類名稱"
                      >
                      <button
                        type="button"
                        class="rounded border border-red-200 px-2 py-1.5 text-xs text-red-700 hover:bg-red-50"
                        @click="removeCategoryFromModule(module, cIdx)"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>

                <div class="rounded-md border border-neutral-200 p-3">
                  <div class="mb-2 flex items-center justify-between">
                    <p class="text-xs font-medium text-neutral-500">商品列表</p>
                    <button
                      type="button"
                      class="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-50"
                      @click="addProductToModule(module)"
                    >
                      新增商品
                    </button>
                  </div>
                  <div class="space-y-3">
                    <div
                      v-for="(product, pIdx) in ensureProductsConfig(module).products"
                      :key="`product-${product.id}-${pIdx}`"
                      class="rounded border border-neutral-200 p-2"
                    >
                      <div class="grid gap-2 md:grid-cols-2">
                        <input
                          v-model="product.id"
                          type="text"
                          class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                          placeholder="商品 id"
                        >
                        <input
                          v-model="product.slug"
                          type="text"
                          class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                          placeholder="slug"
                        >
                        <input
                          v-model="product.name"
                          type="text"
                          class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                          placeholder="商品名稱"
                        >
                        <input
                          v-model="product.priceLabel"
                          type="text"
                          class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                          placeholder="價格顯示（如 HK$199）"
                        >
                        <input
                          v-model="product.categoryId"
                          type="text"
                          class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                          placeholder="分類 id"
                        >
                        <input
                          v-model="product.imageUrl"
                          type="text"
                          class="rounded border border-neutral-300 px-2 py-1.5 text-sm"
                          placeholder="圖片網址"
                        >
                      </div>
                      <div class="mt-2 text-right">
                        <button
                          type="button"
                          class="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                          @click="removeProductFromModule(module, pIdx)"
                        >
                          刪除商品
                        </button>
                      </div>
                    </div>
                    <p
                      v-if="!ensureProductsConfig(module).products.length"
                      class="text-xs text-neutral-500"
                    >
                      尚未設定商品，請新增商品項目。
                    </p>
                  </div>
                </div>
              </div>
            </template>

            <template v-else-if="module.moduleType === 'footer'">
              <label class="text-sm text-neutral-700">
                <span class="mb-1 block text-xs text-neutral-500">頁尾文字</span>
                <textarea
                  v-model="ensureFooterConfig(module).text"
                  rows="3"
                  class="w-full rounded-md border border-neutral-300 px-3 py-2"
                />
              </label>
            </template>

            <details class="mt-3">
              <summary class="cursor-pointer text-xs text-neutral-500">進階：直接編輯 JSON</summary>
              <textarea
                :value="JSON.stringify(module.config, null, 2)"
                rows="8"
                class="mt-2 w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none"
                @input="(event) => updateModuleConfig(module, (event.target as HTMLTextAreaElement).value)"
              />
            </details>
          </div>
        </article>
      </div>
    </div>
  </div>
</template>
