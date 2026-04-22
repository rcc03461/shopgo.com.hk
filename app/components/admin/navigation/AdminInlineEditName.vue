<script setup lang="ts">
const props = defineProps<{
  value: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  save: [value: string]
}>()

const editing = ref(false)
const draft = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

watch(
  () => props.value,
  (next) => {
    if (!editing.value) draft.value = next
  },
  { immediate: true },
)

async function beginEdit() {
  if (props.disabled) return
  editing.value = true
  draft.value = props.value
  await nextTick()
  inputRef.value?.focus()
  inputRef.value?.select()
}

function cancelEdit() {
  editing.value = false
  draft.value = props.value
}

function commitEdit() {
  const next = draft.value.trim()
  if (!next) {
    cancelEdit()
    return
  }
  editing.value = false
  if (next !== props.value) emit('save', next)
}
</script>

<template>
  <div class="min-w-0 flex-1">
    <button
      v-if="!editing"
      type="button"
      class="w-full truncate rounded px-1 py-0.5 text-left text-sm text-neutral-900 hover:bg-neutral-100"
      :disabled="disabled"
      @dblclick="beginEdit"
    >
      {{ value }}
    </button>
    <input
      v-else
      ref="inputRef"
      v-model="draft"
      type="text"
      class="w-full rounded border border-neutral-300 px-2 py-1 text-sm"
      @keydown.enter.prevent="commitEdit"
      @keydown.esc.prevent="cancelEdit"
      @blur="commitEdit"
    >
  </div>
</template>

