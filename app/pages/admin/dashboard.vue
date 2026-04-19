<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const tenantSlug = useState<string | null>('oshop-tenant-slug')

const requestFetch = useRequestFetch()

const { data: stats, error } = await useAsyncData(
  'admin-dashboard-stats',
  async () => {
    const [orders, products, categories] = await Promise.all([
      requestFetch<{ total: number }>('/api/admin/orders', {
        credentials: 'include',
        query: { page: 1, pageSize: 1 },
      }),
      requestFetch<{ total: number }>('/api/admin/products', {
        credentials: 'include',
        query: { page: 1, pageSize: 1 },
      }),
      requestFetch<{ total: number }>('/api/admin/categories', {
        credentials: 'include',
        query: { page: 1, pageSize: 1 },
      }),
    ])
    return {
      orders: orders.total,
      products: products.total,
      categories: categories.total,
    }
  },
)
</script>

<template>
  <div>
    <h1 class="text-xl font-semibold tracking-tight">
      總覽
    </h1>
    <p class="mt-2 text-sm text-neutral-600">
      歡迎使用 <span class="font-mono">{{ tenantSlug }}</span> 的管理後台。
    </p>
    <p v-if="error" class="mt-3 text-sm text-red-600">
      無法載入統計，請確認已登入。
    </p>
    <div class="mt-8 grid gap-4 sm:grid-cols-3">
      <NuxtLink
        to="/admin/orders"
        class="block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow"
      >
        <p class="text-xs text-neutral-500">
          訂單
        </p>
        <p class="mt-2 text-2xl font-semibold text-neutral-900">
          {{ stats ? stats.orders : '—' }}
        </p>
        <p class="mt-2 text-xs text-neutral-500">
          查看列表 →
        </p>
      </NuxtLink>
      <NuxtLink
        to="/admin/products"
        class="block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow"
      >
        <p class="text-xs text-neutral-500">
          商品
        </p>
        <p class="mt-2 text-2xl font-semibold text-neutral-900">
          {{ stats ? stats.products : '—' }}
        </p>
        <p class="mt-2 text-xs text-neutral-500">
          管理商品 →
        </p>
      </NuxtLink>
      <NuxtLink
        to="/admin/categories"
        class="block rounded-lg border border-neutral-200 bg-white p-4 shadow-sm transition hover:border-neutral-300 hover:shadow"
      >
        <p class="text-xs text-neutral-500">
          分類
        </p>
        <p class="mt-2 text-2xl font-semibold text-neutral-900">
          {{ stats ? stats.categories : '—' }}
        </p>
        <p class="mt-2 text-xs text-neutral-500">
          管理分類 →
        </p>
      </NuxtLink>
    </div>
  </div>
</template>
