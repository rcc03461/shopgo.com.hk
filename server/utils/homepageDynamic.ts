import type { HomepageDynamicModule, HomepageModule, HomepageModuleComponentKey } from '../../app/types/homepage'

const componentToModuleType: Record<HomepageModuleComponentKey, HomepageModule['moduleType']> = {
  nav1: 'nav',
  hero3: 'banner',
  category_grid1: 'category',
  product_slider1: 'products',
  footer1: 'footer',
}

const moduleTypeToComponent: Record<HomepageModule['moduleType'], HomepageModuleComponentKey> = {
  nav: 'nav1',
  banner: 'hero3',
  category: 'category_grid1',
  products: 'product_slider1',
  footer: 'footer1',
}

export function dynamicToLegacyModules(items: HomepageDynamicModule[]): HomepageModule[] {
  return items.map((item, index) => {
    const moduleType = componentToModuleType[item.component]
    const moduleKey = item.moduleKey ?? item.uid

    if (item.component === 'product_slider1') {
      const props = item.props as Record<string, unknown>
      return {
        moduleKey,
        moduleType,
        sortOrder: index,
        isEnabled: item.isEnabled,
        config: {
          title: (props.title as string | undefined) ?? '',
          source: props.source ?? { type: 'manual', productIds: [], sort: 'manual' },
          ui: props.ui ?? { perView: 4, autoplay: false, intervalMs: 4000, loop: false },
        },
      }
    }

    return {
      moduleKey,
      moduleType,
      sortOrder: index,
      isEnabled: item.isEnabled,
      config: item.props as HomepageModule['config'],
    }
  })
}

export function legacyToDynamicModules(items: HomepageModule[]): HomepageDynamicModule[] {
  return items.map((item, index) => {
    const component = moduleTypeToComponent[item.moduleType]
    if (component === 'product_slider1') {
      const productsConfig = item.config as Record<string, unknown>
      return {
        uid: item.moduleKey,
        component,
        sortOrder: index,
        isEnabled: item.isEnabled,
        props: {
          title: (productsConfig.title as string | undefined) ?? '',
          source: productsConfig.source ?? {
            type: 'manual',
            productIds: [],
            sort: 'manual',
          },
          ui: productsConfig.ui ?? { perView: 4, autoplay: false, intervalMs: 4000, loop: false },
        },
        moduleKey: item.moduleKey,
        moduleType: item.moduleType,
      }
    }

    return {
      uid: item.moduleKey,
      component,
      sortOrder: index,
      isEnabled: item.isEnabled,
      props: item.config as HomepageDynamicModule['props'],
      moduleKey: item.moduleKey,
      moduleType: item.moduleType,
    }
  })
}
