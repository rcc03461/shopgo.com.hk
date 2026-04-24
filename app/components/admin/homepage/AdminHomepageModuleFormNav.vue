<script setup lang="ts">
import type { HomepageNavModuleConfig } from '../../../types/homepage'

defineProps<{
  config: HomepageNavModuleConfig
}>()
</script>

<template>
  <label class="flex items-center gap-2 text-sm text-neutral-700">
    <input v-model="config.show" type="checkbox" class="h-4 w-4 rounded border-neutral-300">
    顯示頂部導航列
  </label>
</template>
