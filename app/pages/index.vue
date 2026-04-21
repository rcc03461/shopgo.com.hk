<script setup lang="ts">
import {
  landingCategories,
  landingHero,
  landingProducts,
  landingSlides,
} from '~/data/landing'

definePageMeta({
  layout: 'default',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')
</script>

<template>
  <div v-if="tenantSlug" class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
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
  </div>

  <div v-else class="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-24">
    <LandingHeroSection :hero="landingHero" />
    <LandingSliderSection :slides="landingSlides" />
    <LandingCategoriesProductsSection
      :categories="landingCategories"
      :products="landingProducts"
    />
  </div>
</template>
