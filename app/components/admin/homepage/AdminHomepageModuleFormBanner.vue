<script setup lang="ts">
import type { HomepageBannerModuleConfig } from '../../../types/homepage'

defineProps<{
  config: HomepageBannerModuleConfig
}>()
</script>

<template>
  <div class="grid gap-3 md:grid-cols-2">
    <label class="text-sm text-neutral-700">
      <span class="mb-1 block text-xs text-neutral-500">Badge</span>
      <input
        v-model="config.hero.badge"
        type="text"
        class="w-full rounded-md border border-neutral-300 px-3 py-2"
      >
    </label>
    <label class="text-sm text-neutral-700">
      <span class="mb-1 block text-xs text-neutral-500">主標題</span>
      <input
        v-model="config.hero.title"
        type="text"
        class="w-full rounded-md border border-neutral-300 px-3 py-2"
      >
    </label>
    <label class="text-sm text-neutral-700 md:col-span-2">
      <span class="mb-1 block text-xs text-neutral-500">副標題</span>
      <textarea
        v-model="config.hero.subtitle"
        rows="3"
        class="w-full rounded-md border border-neutral-300 px-3 py-2"
      />
    </label>
    <label class="text-sm text-neutral-700">
      <span class="mb-1 block text-xs text-neutral-500">主要 CTA 文字</span>
      <input
        v-model="config.hero.primaryCta.label"
        type="text"
        class="w-full rounded-md border border-neutral-300 px-3 py-2"
      >
    </label>
    <label class="text-sm text-neutral-700">
      <span class="mb-1 block text-xs text-neutral-500">主要 CTA 連結</span>
      <input
        v-model="config.hero.primaryCta.to"
        type="text"
        class="w-full rounded-md border border-neutral-300 px-3 py-2"
      >
    </label>
  </div>
</template>
