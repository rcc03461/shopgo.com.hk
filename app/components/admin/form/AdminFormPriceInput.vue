<script setup lang="ts">
const props = defineProps<{
  label: string
  hint?: string
  required?: boolean
  forId?: string
}>()

const model = defineModel<string>({ required: true })
const autoId = useId()
const inputId = computed(() => props.forId ?? autoId)
</script>

<template>
  <AdminFormField :label="label" :hint="hint" :for-id="inputId">
    <input
      :id="inputId"
      v-model="model"
      type="text"
      inputmode="decimal"
      :required="props.required"
      class="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm shadow-sm"
    />
  </AdminFormField>
</template>
