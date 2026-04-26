<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    widthClass?: string
  }>(),
  {
    subtitle: '',
    widthClass: 'max-w-2xl',
  },
)

const open = defineModel<boolean>('open', { default: false })

function onMaskClick() {
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-40 bg-black/40"
        @click="onMaskClick"
      />
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-x-0 opacity-100"
      leave-to-class="translate-x-full opacity-0"
    >
      <aside
        v-if="open"
        class="fixed inset-y-0 right-0 z-50 flex w-full justify-end"
        aria-modal="true"
        role="dialog"
      >
        <div
          :class="[
            'flex h-full w-full flex-col border-l border-neutral-200 bg-white shadow-xl',
            props.widthClass,
          ]"
        >
          <header class="flex items-start justify-between border-b border-neutral-200 px-4 py-3">
            <div>
              <h2 class="text-base font-semibold text-neutral-900">
                {{ props.title }}
              </h2>
              <p v-if="props.subtitle" class="mt-1 text-sm text-neutral-600">
                {{ props.subtitle }}
              </p>
            </div>
            <button
              type="button"
              class="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100"
              @click="open = false"
            >
              關閉
            </button>
          </header>

          <div class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <slot />
          </div>

          <footer
            v-if="$slots.footer"
            class="border-t border-neutral-200 bg-neutral-50 px-4 py-3"
          >
            <slot name="footer" />
          </footer>
        </div>
      </aside>
    </Transition>
  </Teleport>
</template>
