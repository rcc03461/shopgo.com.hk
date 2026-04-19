<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string
    hint?: string
    type?: string
    autocomplete?: string
    required?: boolean
    pattern?: string
    title?: string
    inputClass?: string
    forId?: string
  }>(),
  { type: 'text', inputClass: '' },
)

const model = defineModel<string>({ required: true })
const autoId = useId()
const inputId = computed(() => props.forId ?? autoId)
</script>

<template>
  <AdminFormField :label="label" :hint="hint" :for-id="inputId">
    <input
      :id="inputId"
      v-model="model"
      :type="type"
      :autocomplete="autocomplete"
      :required="required"
      :pattern="pattern"
      :title="title"
      :class="[
        'w-full rounded-md border border-neutral-300 px-3 py-2 text-sm shadow-sm',
        inputClass,
      ]"
    />
  </AdminFormField>
</template>
