<script setup lang="ts">
defineProps<{
  label: string
  hint?: string
  forId?: string
}>()
</script>

<template>
  <div class="block text-sm text-neutral-700">
    <label :for="forId" class="block">
      <span class="font-medium">{{ label }}</span>
      <p v-if="hint" class="mt-0.5 text-xs text-neutral-500">
        {{ hint }}
      </p>
      <div class="mt-1">
        <slot />
      </div>
    </label>
  </div>
</template>
