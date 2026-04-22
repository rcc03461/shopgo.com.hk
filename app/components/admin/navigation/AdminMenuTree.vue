<script setup lang="ts">
import { move } from '@dnd-kit/helpers'
import { DragDropProvider, type DragEndEvent } from '@dnd-kit/vue'
import { isSortable } from '@dnd-kit/vue/sortable'
import AdminMenuSortableItem from './AdminMenuSortableItem.vue'
import type { AdminMenuNode } from './AdminMenuTreeItem.vue'

const props = withDefaults(
  defineProps<{
    depth?: number
    maxDepth?: number
    busy?: boolean
  }>(),
  {
    depth: 0,
    maxDepth: 3,
    busy: false,
  },
)

const items = defineModel<AdminMenuNode[]>('items', { required: true })

const emit = defineEmits<{
  changed: []
  toggleVisible: [item: AdminMenuNode]
  edit: [item: AdminMenuNode]
  remove: [item: AdminMenuNode]
  rename: [item: AdminMenuNode, title: string]
  addChild: [item: AdminMenuNode]
}>()

function onDragEnd(event: DragEndEvent) {
  if (event.canceled || !items.value?.length) return
  const { source } = event.operation
  if (!isSortable(source)) return
  const next = move(items.value, event)
  items.value = next
  emit('changed')
}
</script>

<template>
  <DragDropProvider @dragEnd="onDragEnd">
    <div class="space-y-2">
      <AdminMenuSortableItem
        v-for="(item, index) in items"
        :key="item.id"
        :item="item"
        :index="index"
        :depth="depth"
        :max-depth="maxDepth"
        :busy="busy"
        @changed="emit('changed')"
        @toggle-visible="(x) => emit('toggleVisible', x)"
        @edit="(x) => emit('edit', x)"
        @remove="(x) => emit('remove', x)"
        @rename="(x, title) => emit('rename', x, title)"
        @add-child="(x) => emit('addChild', x)"
      />
    </div>
  </DragDropProvider>
</template>

