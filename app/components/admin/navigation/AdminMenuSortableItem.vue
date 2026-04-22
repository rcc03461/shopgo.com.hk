<script setup lang="ts">
import { useSortable } from '@dnd-kit/vue/sortable'
import AdminMenuTree from './AdminMenuTree.vue'
import AdminMenuTreeItem from './AdminMenuTreeItem.vue'
import type { AdminMenuNode } from './AdminMenuTreeItem.vue'

const props = defineProps<{
  item: AdminMenuNode
  index: number
  depth: number
  maxDepth: number
  busy?: boolean
}>()

const emit = defineEmits<{
  changed: []
  toggleVisible: [item: AdminMenuNode]
  edit: [item: AdminMenuNode]
  remove: [item: AdminMenuNode]
  rename: [item: AdminMenuNode, title: string]
  addChild: [item: AdminMenuNode]
}>()

const element = ref<HTMLElement | null>(null)
useSortable({
  id: computed(() => props.item.id),
  index: computed(() => props.index),
  element,
  disabled: computed(() => Boolean(props.busy)),
})
</script>

<template>
  <div ref="element">
    <AdminMenuTreeItem
      :item="item"
      :depth="depth"
      :busy="busy"
      :can-add-child="depth < maxDepth - 1"
      @toggle-visible="(x) => emit('toggleVisible', x)"
      @edit="(x) => emit('edit', x)"
      @remove="(x) => emit('remove', x)"
      @rename="(x, title) => emit('rename', x, title)"
      @add-child="(x) => emit('addChild', x)"
    />

    <div v-if="item.children?.length" class="ml-8 mt-2 border-l border-neutral-200 pl-3">
      <AdminMenuTree
        v-model:items="item.children"
        :depth="depth + 1"
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
  </div>
</template>

