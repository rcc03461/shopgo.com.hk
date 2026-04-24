<script setup lang="ts">
import type { HomepageFooterModuleConfig } from '../../../types/homepage'

defineProps<{
  config: HomepageFooterModuleConfig
}>()
</script>

<template>
  <label class="text-sm text-neutral-700">
    <span class="mb-1 block text-xs text-neutral-500">頁尾文字</span>
    <textarea
      v-model="config.text"
      rows="3"
      class="w-full rounded-md border border-neutral-300 px-3 py-2"
    />
  </label>
</template>
