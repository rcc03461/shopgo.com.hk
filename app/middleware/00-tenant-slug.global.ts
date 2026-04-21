import { parseTenantSlugFromHost } from '~/utils/tenantHost'
import { getRequestHostForMiddleware } from '~/utils/requestHost'

/**
 * 依 Host 解析租戶 slug，供頁面與 admin middleware 使用。
 */
export default defineNuxtRouteMiddleware(() => {
  const state = useState<string | null>('oshop-tenant-slug', () => null)
  if (import.meta.client) {
    const nuxtApp = useNuxtApp()
    // hydration 期間沿用 SSR 注水狀態，避免首屏 DOM 分支不一致。
    if (nuxtApp.isHydrating) return
  }

  const config = useRuntimeConfig()
  const root = String(config.public.tenantRootDomain || 'oshop.com.hk')
  const host = getRequestHostForMiddleware()
  const slug = parseTenantSlugFromHost(host, root)
  state.value = slug
})
