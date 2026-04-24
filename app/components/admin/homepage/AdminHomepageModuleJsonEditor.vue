<script setup lang="ts">
const props = defineProps<{
  value: string
  error?: string | null
}>()

const emit = defineEmits<{
  update: [value: string]
}>()
</script>

<template>
  <details class="mt-3">
    <summary class="cursor-pointer text-xs text-neutral-500">進階：直接編輯 JSON</summary>
    <ClientOnly>
      <textarea
        :value="props.value"
        rows="8"
        class="mt-2 w-full rounded-md border px-3 py-2 font-mono text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none"
        :class="props.error ? 'border-red-300' : 'border-neutral-300'"
        @input="emit('update', ($event.target as HTMLTextAreaElement).value)"
      />
      <template #fallback>
        <div class="mt-2 h-24 w-full rounded-md border border-neutral-200 bg-neutral-50" />
      </template>
    </ClientOnly>
    <p v-if="props.error" class="mt-2 text-xs text-red-700">{{ props.error }}</p>
  </details>
</template>
