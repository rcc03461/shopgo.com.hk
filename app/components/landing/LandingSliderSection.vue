<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { LandingSlide } from '~/types/landing'

const props = defineProps<{
  slides: LandingSlide[]
  intervalMs?: number
}>()

const currentIndex = ref(0)
const autoplayHandle = ref<ReturnType<typeof setInterval> | null>(null)

const totalSlides = computed(() => props.slides.length)

const currentSlide = computed(() => props.slides[currentIndex.value] ?? null)

const stopAutoplay = () => {
  if (autoplayHandle.value) {
    clearInterval(autoplayHandle.value)
    autoplayHandle.value = null
  }
}

const startAutoplay = () => {
  stopAutoplay()
  if (totalSlides.value <= 1) return
  autoplayHandle.value = setInterval(() => {
    currentIndex.value = (currentIndex.value + 1) % totalSlides.value
  }, props.intervalMs ?? 5000)
}

const goToSlide = (index: number) => {
  currentIndex.value = index
  startAutoplay()
}

const goNext = () => {
  if (!totalSlides.value) return
  currentIndex.value = (currentIndex.value + 1) % totalSlides.value
  startAutoplay()
}

const goPrev = () => {
  if (!totalSlides.value) return
  currentIndex.value = (currentIndex.value - 1 + totalSlides.value) % totalSlides.value
  startAutoplay()
}

watch(
  () => props.slides,
  () => {
    currentIndex.value = 0
    startAutoplay()
  },
  { deep: true },
)

onMounted(() => {
  startAutoplay()
})

onBeforeUnmount(() => {
  stopAutoplay()
})
</script>

<template>
  <section class="mx-auto mt-16 max-w-5xl">
    <div
      v-if="currentSlide"
      class="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
    >
      <div class="grid md:grid-cols-2">
        <img
          :src="currentSlide.imageUrl"
          :alt="currentSlide.title"
          class="h-56 w-full object-cover md:h-full"
        />
        <div class="flex flex-col justify-center px-6 py-8 sm:px-8">
          <p class="text-xs font-medium uppercase tracking-widest text-neutral-500">
            精選焦點
          </p>
          <h2 class="mt-3 text-2xl font-semibold tracking-tight text-neutral-900">
            {{ currentSlide.title }}
          </h2>
          <p class="mt-3 text-sm leading-relaxed text-neutral-600">
            {{ currentSlide.description }}
          </p>
          <NuxtLink
            v-if="currentSlide.cta"
            :to="currentSlide.cta.to"
            class="mt-6 inline-flex w-fit rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            {{ currentSlide.cta.label }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="mt-4 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <button
          type="button"
          aria-label="上一張"
          class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          @click="goPrev"
        >
          上一張
        </button>
        <button
          type="button"
          aria-label="下一張"
          class="rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          @click="goNext"
        >
          下一張
        </button>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-for="(slide, index) in slides"
          :key="slide.id"
          type="button"
          :aria-label="`切換到第 ${index + 1} 張`"
          :aria-current="currentIndex === index ? 'true' : 'false'"
          class="h-2.5 w-2.5 rounded-full transition"
          :class="currentIndex === index ? 'bg-neutral-900' : 'bg-neutral-300 hover:bg-neutral-400'"
          @click="goToSlide(index)"
        />
      </div>
    </div>
  </section>
</template>
