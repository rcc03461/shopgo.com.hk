<script setup lang="ts">
import type { HomepageCategoryModuleConfig } from '../../../types/homepage'

defineProps<{
  config: HomepageCategoryModuleConfig
}>()

const emit = defineEmits<{
  addCategory: []
  removeCategory: [index: number]
}>()
</script>

<template>
  <div class="space-y-3">
    <label class="text-sm text-neutral-700">
      <span class="mb-1 block text-xs text-neutral-500">區塊標題</span>
      <input
        v-model="config.title"
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
          @click="emit('addCategory')"
        >
          新增分類
        </button>
      </div>
      <div class="space-y-2">
        <div
          v-for="(category, cIdx) in config.categories"
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
            @click="emit('removeCategory', cIdx)"
          >
            刪除
          </button>
        </div>
        <p v-if="!config.categories.length" class="text-xs text-neutral-500">
          尚未設定分類，請先新增至少一個分類。
        </p>
      </div>
    </div>
  </div>
</template>
