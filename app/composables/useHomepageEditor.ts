import type { HomepageDynamicModule, HomepageModule } from '../types/homepage'
import {
  addCategoryToDynamicModule,
  addProductToDynamicModule,
  moveDynamicHomepageModule,
  normalizeDynamicHomepageModuleOrder,
  removeCategoryFromDynamicModule,
  removeProductFromDynamicModule,
  toDynamicHomepageModules,
  updateDynamicModulePropsFromJson,
} from '../utils/homepageEditor'
import { resolveDynamicHomepageModules } from '../utils/homepageModuleResolvers'

type HomepageModulesResponse = {
  items: HomepageModule[]
  dynamicItems?: HomepageDynamicModule[]
  hasPublished: boolean
}

type AdminCategoryOption = { id: string; label: string }
type AdminProductOption = {
  id: string
  name: string
  slug: string
  priceLabel: string
  categoryIds: string[]
  coverUrl: string | null
}

export function useHomepageEditor() {
  const requestFetch = useRequestFetch()
  const saving = ref(false)
  const publishing = ref(false)
  const saveError = ref<string | null>(null)
  const draftItems = ref<HomepageModule[]>([])
  const draftDynamicItems = ref<HomepageDynamicModule[]>([])
  const jsonErrors = ref<Record<string, string | null>>({})

  const { data, pending, error, refresh } = useAsyncData(
    'admin-homepage-modules',
    async () =>
      await requestFetch<HomepageModulesResponse>('/api/admin/homepage/modules', {
        credentials: 'include',
      }),
  )

  const { data: adminCategoriesData } = useAsyncData(
    'admin-homepage-categories-options',
    async () =>
      await requestFetch<{ items: Array<{ id: string; name: string }> }>('/api/admin/categories', {
        credentials: 'include',
        query: { page: 1, pageSize: 100 },
      }),
  )

  const { data: adminProductsData } = useAsyncData(
    'admin-homepage-products-options',
    async () =>
      await requestFetch<{
        items: Array<{
          id: string
          title: string
          slug: string
          basePrice: string
          categoryIds?: string[]
          coverUrl?: string | null
        }>
      }>('/api/admin/products', {
        credentials: 'include',
        query: { page: 1, pageSize: 100 },
      }),
  )

  watch(
    () => data.value,
    (payload) => {
      const items = payload?.dynamicItems
      if (items?.length) {
        draftDynamicItems.value = normalizeDynamicHomepageModuleOrder(structuredClone(items))
      } else {
        draftItems.value = structuredClone(payload?.items ?? [])
        draftDynamicItems.value = toDynamicHomepageModules(draftItems.value)
      }
      jsonErrors.value = {}
    },
    { immediate: true },
  )

  const hasPublished = computed(() => data.value?.hasPublished ?? false)

  function moveItem(index: number, delta: number) {
    draftDynamicItems.value = moveDynamicHomepageModule(draftDynamicItems.value, index, delta)
  }

  function updateJson(module: HomepageDynamicModule, value: string) {
    const errorMessage = updateDynamicModulePropsFromJson(module, value)
    jsonErrors.value[module.uid] = errorMessage
    saveError.value = errorMessage
  }

  function addCategory(
    module: HomepageDynamicModule<'category_grid1'> | HomepageDynamicModule<'product_slider1'>,
  ) {
    addCategoryToDynamicModule(module)
  }

  function removeCategory(
    module: HomepageDynamicModule<'category_grid1'> | HomepageDynamicModule<'product_slider1'>,
    index: number,
  ) {
    removeCategoryFromDynamicModule(module, index)
  }

  function addProduct(module: HomepageDynamicModule<'product_slider1'>) {
    addProductToDynamicModule(module)
  }

  function removeProduct(module: HomepageDynamicModule<'product_slider1'>, index: number) {
    removeProductFromDynamicModule(module, index)
  }

  const availableCategories = computed(() => {
    const map = new Map<string, { id: string; label: string }>()

    for (const category of adminCategoriesData.value?.items ?? []) {
      if (!category?.id) continue
      map.set(category.id, { id: category.id, label: category.name || category.id })
    }

    for (const module of draftDynamicItems.value) {
      if (module.component !== 'category_grid1' && module.component !== 'product_slider1') continue
      const categories = (module.props as { categories?: Array<{ id: string; label: string }> }).categories
      if (!Array.isArray(categories)) continue
      for (const category of categories) {
        if (!category?.id) continue
        map.set(category.id, { id: category.id, label: category.label || category.id })
      }
    }

    return [...map.values()]
  })

  const availableProducts = computed<AdminProductOption[]>(() => {
    const map = new Map<string, AdminProductOption>()

    for (const product of adminProductsData.value?.items ?? []) {
      if (!product?.id) continue
      map.set(product.id, {
        id: product.id,
        name: product.title || product.id,
        slug: product.slug || '',
        priceLabel: `HK$${product.basePrice ?? '0'}`,
        categoryIds: product.categoryIds ?? [],
        coverUrl: product.coverUrl ?? null,
      })
    }

    return [...map.values()]
  })

  const resolvedPreviewModules = computed(() =>
    resolveDynamicHomepageModules(draftDynamicItems.value, {
      categories: availableCategories.value.map((item) => ({ id: item.id, label: item.label })),
      products: availableProducts.value.flatMap((product) => {
        const categoryIds = product.categoryIds.length ? product.categoryIds : ['']
        return categoryIds.map((categoryId) => ({
          id: product.id,
          categoryId,
          name: product.name,
          slug: product.slug,
          priceLabel: product.priceLabel,
          imageUrl:
            product.coverUrl
            ?? 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=800&q=80',
        }))
      }),
    }),
  )

  async function saveDraft() {
    saveError.value = null
    saving.value = true

    try {
      await $fetch('/api/admin/homepage/modules', {
        method: 'PUT',
        credentials: 'include',
        body: { items: normalizeDynamicHomepageModuleOrder(draftDynamicItems.value) },
      })
      await refresh()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      saveError.value = err?.data?.message || err?.message || '儲存草稿失敗'
    } finally {
      saving.value = false
    }
  }

  async function publishDraft() {
    saveError.value = null
    publishing.value = true

    try {
      await $fetch('/api/admin/homepage/modules/publish', {
        method: 'POST',
        credentials: 'include',
      })
      await refresh()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      saveError.value = err?.data?.message || err?.message || '發佈失敗'
    } finally {
      publishing.value = false
    }
  }

  async function resetDraft() {
    saveError.value = null
    saving.value = true

    try {
      await $fetch('/api/admin/homepage/modules/reset-draft', {
        method: 'POST',
        credentials: 'include',
      })
      await refresh()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      saveError.value = err?.data?.message || err?.message || '還原草稿失敗'
    } finally {
      saving.value = false
    }
  }

  return {
    draftItems,
    draftDynamicItems,
    availableCategories,
    availableProducts,
    resolvedPreviewModules,
    pending,
    error,
    hasPublished,
    saving,
    publishing,
    saveError,
    jsonErrors,
    moveItem,
    updateJson,
    addCategory,
    removeCategory,
    addProduct,
    removeProduct,
    saveDraft,
    publishDraft,
    resetDraft,
  }
}
