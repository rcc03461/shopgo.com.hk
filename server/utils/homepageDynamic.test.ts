// @ts-ignore Bun test types are not configured in this repository yet.
import { describe, expect, test } from 'bun:test'
import type { HomepageModule } from '../../app/types/homepage'
import { legacyToDynamicModules } from './homepageDynamic'

describe('homepage dynamic server conversion', () => {
  test('legacyToDynamicModules 會依 sortOrder 排列，讓首頁展示順序與後台一致', () => {
    const modules: HomepageModule[] = [
      {
        moduleKey: 'footer',
        moduleType: 'footer',
        sortOrder: 2,
        isEnabled: true,
        config: { text: 'footer' },
      },
      {
        moduleKey: 'image-slider',
        moduleType: 'image_slider',
        sortOrder: 0,
        isEnabled: true,
        config: {
          title: 'slider',
          slides: [],
          ui: { autoplay: false, intervalMs: 4000, loop: true },
        },
      },
      {
        moduleKey: 'products',
        moduleType: 'products',
        sortOrder: 1,
        isEnabled: true,
        config: {
          title: 'products',
          categories: [],
          products: [],
        },
      },
    ]

    const dynamic = legacyToDynamicModules(modules)

    expect(dynamic.map((item) => item.component)).toEqual(['image_slider1', 'product_slider1', 'footer1'])
    expect(dynamic.map((item) => item.sortOrder)).toEqual([0, 1, 2])
  })
})
