<script setup lang="ts">
import AdminInlineEditName from './AdminInlineEditName.vue'

export type AdminMenuNode = {
  id: string
  title: string
  parentId: string | null
  sortOrder: number
  isVisible: boolean
  linkType: 'page' | 'custom'
  pageId: string | null
  customUrl: string | null
  target: '_self' | '_blank'
  pageSlug?: string | null
  children: AdminMenuNode[]
}

const props = defineProps<{
  item: AdminMenuNode
  depth: number
  busy?: boolean
  canAddChild?: boolean
}>()

const emit = defineEmits<{
  toggleVisible: [item: AdminMenuNode]
  edit: [item: AdminMenuNode]
  remove: [item: AdminMenuNode]
  rename: [item: AdminMenuNode, title: string]
  addChild: [item: AdminMenuNode]
}>()
</script>

<template>
  <div class="rounded-lg border border-neutral-300 bg-white px-3 py-2">
    <div class="flex items-center gap-2">
      <span class="cursor-grab select-none text-neutral-400">⋮⋮</span>
      <AdminInlineEditName
        :value="item.title"
        :disabled="busy"
        @save="(title) => emit('rename', item, title)"
      />
      <span class="shrink-0 text-[11px] text-neutral-500">
        {{ item.linkType === 'page' ? '頁面' : '自訂' }}
      </span>
      <div class="ml-auto flex items-center gap-1">
        <button
          type="button"
          class="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          :title="item.isVisible ? '隱藏' : '顯示'"
          :disabled="busy"
          @click="emit('toggleVisible', item)"
        >
          {{ item.isVisible ? '👁' : '🙈' }}
        </button>
        <button
          v-if="canAddChild"
          type="button"
          class="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          :disabled="busy"
          @click="emit('addChild', item)"
        >
          子項
        </button>
        <button
          type="button"
          class="rounded border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          :disabled="busy"
          @click="emit('edit', item)"
        >
          編輯
        </button>
        <button
          type="button"
          class="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
          :disabled="busy"
          @click="emit('remove', item)"
        >
          刪除
        </button>
      </div>
    </div>
  </div>
</template>

