<script setup lang="ts">
import { formatHkd } from '~/utils/formatHkd'

type HomepageProductCardData = {
  slug: string
  title?: string
  name?: string
  coverUrl?: string | null
  imageUrl?: string | null
  displayPrice?: string
  priceLabel?: string
  originalPrice?: string | null
  hasVariants?: boolean
}

const props = defineProps<{
  product: HomepageProductCardData
}>()

const productTitle = computed(() => props.product.title || props.product.name || '未命名商品')
const productImage = computed(() => props.product.coverUrl || props.product.imageUrl || null)
const displayPriceText = computed(() => {
  if (props.product.displayPrice) return formatHkd(props.product.displayPrice)
  if (props.product.priceLabel) return props.product.priceLabel
  return 'HK$0'
})

function shouldShowOriginalPrice(originalPrice: string | null | undefined, displayPrice: string | undefined) {
  if (!originalPrice || !displayPrice) return false
  return Number(originalPrice) > Number(displayPrice)
}
</script>

<template>
  <NuxtLink
    :to="`/products/${product.slug}`"
    class="group flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm transition hover:border-neutral-300 hover:shadow"
  >
    <div class="aspect-[4/3] bg-neutral-100">
      <img
        v-if="productImage"
        :src="productImage"
        :alt="productTitle"
        class="h-full w-full object-cover object-center aspect-square transition group-hover:opacity-95"
        loading="lazy"
      >
      <div
        v-else
        class="flex h-full w-full items-center justify-center text-xs text-neutral-400"
      >
        無封面
      </div>
    </div>
    <div class="flex flex-1 flex-col gap-1 p-4">
      <h3 class="text-sm font-semibold text-neutral-900 group-hover:underline">
        {{ productTitle }}
      </h3>
      <p class="font-mono text-xs text-neutral-500">
        /{{ product.slug }}
      </p>
      <p class="mt-auto pt-2 text-sm font-medium text-neutral-900">
        {{ displayPriceText }}
        <span v-if="product.hasVariants" class="text-xs font-normal text-neutral-500">起</span>
      </p>
      <p
        v-if="shouldShowOriginalPrice(product.originalPrice, product.displayPrice)"
        class="text-xs text-neutral-400 line-through"
      >
        {{ formatHkd(product.originalPrice!) }}
      </p>
    </div>
  </NuxtLink>
</template>
