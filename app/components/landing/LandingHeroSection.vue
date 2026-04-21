<script setup lang="ts">
import type { LandingHero } from '~/types/landing'

defineProps<{
  hero: LandingHero
}>()
</script>

<template>
  <section class="mx-auto max-w-2xl text-center">
    <p class="text-xs font-medium uppercase tracking-widest text-neutral-500">
      {{ hero.badge }}
    </p>
    <h1 class="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
      {{ hero.title }}
    </h1>
    <p class="mt-4 text-sm leading-relaxed text-neutral-600 sm:text-base">
      {{ hero.subtitle }}
    </p>
    <div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
      <NuxtLink
        :to="hero.primaryCta.to"
        class="inline-flex w-full max-w-xs items-center justify-center rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800 sm:w-auto"
      >
        {{ hero.primaryCta.label }}
      </NuxtLink>
      <NuxtLink
        :to="hero.secondaryCta.to"
        class="inline-flex w-full max-w-xs items-center justify-center rounded-md border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50 sm:w-auto"
      >
        {{ hero.secondaryCta.label }}
      </NuxtLink>
    </div>
  </section>
</template>
