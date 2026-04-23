<script setup lang="ts">
import { landingHero, landingSlides } from '~/data/landing'
import type { LandingCategory, LandingProductCard } from '~/types/landing'

definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
const requestFetch = useRequestFetch()

const {
  data: tenantLandingData,
  pending: tenantLandingPending,
  error: tenantLandingError,
  refresh: refreshTenantLanding,
} = await useAsyncData(
  'tenant-landing-categories-products',
  async () => {
    if (!tenantSlug.value) {
      return {
        categories: [] as LandingCategory[],
        products: [] as LandingProductCard[],
      }
    }

    const fetchApi = import.meta.server ? requestFetch : $fetch

    const categoryRes = await fetchApi<{ categories: Array<{ id: string; name: string }> }>(
      '/api/store/categories',
    )

    const categories: LandingCategory[] = categoryRes.categories.map((category) => ({
      id: category.id,
      label: category.name,
    }))

    const productResponses = await Promise.allSettled(
      categories.map(async (category) => {
        const res = await fetchApi<{
          items: Array<{
            id: string
            slug: string
            title: string
            displayPrice: string
            coverUrl: string | null
          }>
        }>('/api/store/products', {
          query: {
            categoryId: category.id,
            page: 1,
            pageSize: 4,
          },
        })

        return res.items.map(
          (item): LandingProductCard => ({
            id: item.id,
            categoryId: category.id,
            name: item.title,
            slug: item.slug,
            priceLabel: `HK$${item.displayPrice}`,
            imageUrl:
              item.coverUrl ??
              'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
          }),
        )
      }),
    )

    return {
      categories,
      products: productResponses
        .filter(
          (
            result,
          ): result is PromiseFulfilledResult<LandingProductCard[]> =>
            result.status === 'fulfilled',
        )
        .flatMap((result) => result.value),
    }
  },
)

const tenantLandingCategories = computed(
  () => tenantLandingData.value?.categories ?? [],
)

const tenantLandingProducts = computed(
  () => tenantLandingData.value?.products ?? [],
)
</script>

<template>
  <div v-if="tenantSlug" class="mx-auto max-w-5xl px-4 py-16 sm:px-6">
    <p class="text-xs font-medium uppercase tracking-widest text-neutral-500">
      租戶店舖
    </p>
    <h1 class="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">
      <span class="font-mono">{{ tenantSlug }}</span>
    </h1>
    <p class="mt-3 text-sm text-neutral-600">
      店舖首頁（模組化版面將於之後接入）。管理商品與設定請進後台。
    </p>
    <div class="mt-8 flex flex-wrap gap-3">
      <NuxtLink
        to="/products"
        class="inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
      >
        瀏覽商品
      </NuxtLink>
      <NuxtLink
        to="/admin/dashboard"
        class="inline-flex rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
      >
        進入後台
      </NuxtLink>
      <NuxtLink
        to="/admin/login"
        class="inline-flex rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
      >
        管理員登入
      </NuxtLink>
    </div>
    <LandingCategoriesProductsSection
      v-if="!tenantLandingPending && !tenantLandingError"
      :categories="tenantLandingCategories"
      :products="tenantLandingProducts"
    />
    <section
      v-else-if="tenantLandingPending"
      class="mt-16 animate-pulse rounded-xl border border-neutral-200 p-6"
      aria-label="分類商品載入中"
    >
      <div class="h-4 w-32 rounded bg-neutral-200" />
      <div class="mt-4 flex flex-wrap gap-2">
        <div class="h-8 w-20 rounded-full bg-neutral-200" />
        <div class="h-8 w-24 rounded-full bg-neutral-200" />
        <div class="h-8 w-16 rounded-full bg-neutral-200" />
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="n in 4"
          :key="`landing-skeleton-${n}`"
          class="overflow-hidden rounded-xl border border-neutral-200"
        >
          <div class="h-40 bg-neutral-200" />
          <div class="space-y-2 px-4 py-4">
            <div class="h-4 w-4/5 rounded bg-neutral-200" />
            <div class="h-4 w-2/5 rounded bg-neutral-200" />
            <div class="h-4 w-1/3 rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </section>
    <section
      v-else
      class="mt-16 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
      aria-live="polite"
    >
      <p>分類商品載入失敗，請稍後再試。</p>
      <button
        type="button"
        class="mt-3 inline-flex rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        @click="() => refreshTenantLanding()"
      >
        重新載入
      </button>
    </section>
  </div>

  <div v-else class="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
    <LandingHeroSection :hero="landingHero" />
    <LandingSliderSection :slides="landingSlides" />

  </div>
</template>
