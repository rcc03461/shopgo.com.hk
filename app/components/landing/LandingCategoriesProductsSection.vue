<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LandingCategory, LandingProductCard } from '~/types/landing'

const props = defineProps<{
  categories: LandingCategory[]
  products: LandingProductCard[]
}>()

const activeCategoryId = ref(props.categories[0]?.id ?? '')

const activeProducts = computed(() =>
  props.products.filter((product) => product.categoryId === activeCategoryId.value),
)

const setActiveCategory = (categoryId: string) => {
  activeCategoryId.value = categoryId
}
</script>

<template>
  <section class="mx-auto mt-16 max-w-6xl border-t border-neutral-200 pt-16">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-xs font-medium uppercase tracking-widest text-neutral-500">分類商品</p>
        <h2 class="mt-2 text-2xl font-semibold tracking-tight text-neutral-900">
          依分類探索熱賣品
        </h2>
      </div>
    </div>

    <div class="mt-6 flex flex-wrap gap-2">
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        class="rounded-full border px-4 py-1.5 text-sm font-medium transition"
        :class="
          activeCategoryId === category.id
            ? 'border-neutral-900 bg-neutral-900 text-white'
            : 'border-neutral-300 text-neutral-700 hover:bg-neutral-50'
        "
        @click="setActiveCategory(category.id)"
      >
        {{ category.label }}
      </button>
    </div>

    <div v-if="activeProducts.length" class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article
        v-for="product in activeProducts"
        :key="product.id"
        class="overflow-hidden rounded-xl border border-neutral-200 bg-white"
      >
        <img :src="product.imageUrl" :alt="product.name" class="h-44 w-full object-cover" />
        <div class="space-y-2 px-4 py-4">
          <h3 class="line-clamp-2 text-sm font-semibold text-neutral-900">
            {{ product.name }}
          </h3>
          <p class="text-sm font-medium text-neutral-700">{{ product.priceLabel }}</p>
          <NuxtLink
            :to="`/products/${product.slug}`"
            class="inline-flex text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-700"
          >
            查看商品
          </NuxtLink>
        </div>
      </article>
    </div>

    <div
      v-else
      class="mt-8 rounded-xl border border-dashed border-neutral-300 px-4 py-8 text-sm text-neutral-600"
    >
      此分類目前沒有商品，請稍後再回來查看。
    </div>
  </section>
</template>
