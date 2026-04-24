<script setup lang="ts">
defineProps<{
  show: boolean
}>()
</script>

<template>
  <div v-if="show" class="hidden" />
</template>
