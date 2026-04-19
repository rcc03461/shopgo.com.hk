<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    hint?: string
    rows?: number
    inputClass?: string
    forId?: string
  }>(),
  { rows: 4, inputClass: '' },
)

const model = defineModel<string>({ required: true })
const autoId = useId()
const inputId = computed(() => props.forId ?? autoId)
</script>

<template>
  <AdminFormField :label="label" :hint="hint" :for-id="inputId">
    <textarea
      :id="inputId"
      v-model="model"
      :rows="rows"
      :class="[
        'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm',
        inputClass,
      ]"
    />
  </AdminFormField>
</template>
