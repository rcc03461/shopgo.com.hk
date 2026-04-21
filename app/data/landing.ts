import type {
  LandingCategory,
  LandingHero,
  LandingProductCard,
  LandingSlide,
} from '~/types/landing'

export const landingHero: LandingHero = {
  badge: '多租戶線上商店',
  title: '幾分鐘開店，專注賣貨',
  subtitle:
    'OShop 提供極簡店面與標準購物流程。註冊後即可取得專屬子網域，快速上線並持續擴充。',
  primaryCta: {
    label: '立即開店',
    to: '/admin/register',
  },
  secondaryCta: {
    label: '已有商店？管理員登入',
    to: '/admin/login',
  },
}

export const landingSlides: LandingSlide[] = [
  {
    id: 'launch-fast',
    title: '快速開店',
    description: '完成註冊後即建立專屬店舖網址，直接開始經營品牌。',
    imageUrl: 'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1200&q=80',
    cta: { label: '了解註冊流程', to: '/admin/register' },
  },
  {
    id: 'tenant-isolation',
    title: '租戶隔離',
    description: '每個商店資料獨立管理，降低跨店資料風險。',
    imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'simple-theme',
    title: '極簡佈景',
    description: '以商品為主角，保留留白與清晰資訊層級。',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80',
  },
  {
    id: 'checkout-flow',
    title: '標準購物流程',
    description: '商品瀏覽、購物車與付款流程可快速啟用。',
    imageUrl: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=1200&q=80',
  },
]

export const landingCategories: LandingCategory[] = [
  { id: 'new-arrivals', label: '最新上架' },
  { id: 'home-living', label: '家居生活' },
  { id: 'beauty-care', label: '美妝保養' },
  { id: 'digital-goods', label: '數位配件' },
]

export const landingProducts: LandingProductCard[] = [
  {
    id: 'p-001',
    categoryId: 'new-arrivals',
    name: '晨光香氛蠟燭',
    slug: 'morning-candle',
    priceLabel: 'HK$168',
    imageUrl: 'https://images.unsplash.com/photo-1603006905393-c7f95f5f5c7f?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-002',
    categoryId: 'new-arrivals',
    name: '極簡帆布托特包',
    slug: 'minimal-tote-bag',
    priceLabel: 'HK$239',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-003',
    categoryId: 'new-arrivals',
    name: '手作玻璃花瓶',
    slug: 'glass-vase',
    priceLabel: 'HK$320',
    imageUrl: 'https://images.unsplash.com/photo-1616627781431-23a0f9c2f6fd?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-004',
    categoryId: 'new-arrivals',
    name: '霧面陶瓷杯組',
    slug: 'ceramic-cup-set',
    priceLabel: 'HK$198',
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-005',
    categoryId: 'home-living',
    name: '北歐風抱枕套',
    slug: 'nordic-cushion-cover',
    priceLabel: 'HK$129',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-006',
    categoryId: 'home-living',
    name: '原木收納托盤',
    slug: 'wooden-tray',
    priceLabel: 'HK$188',
    imageUrl: 'https://images.unsplash.com/photo-1616627453234-cf2f4a6bb58d?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-007',
    categoryId: 'home-living',
    name: '亞麻桌巾',
    slug: 'linen-tablecloth',
    priceLabel: 'HK$219',
    imageUrl: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-008',
    categoryId: 'home-living',
    name: '金屬立燈',
    slug: 'metal-floor-lamp',
    priceLabel: 'HK$520',
    imageUrl: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-009',
    categoryId: 'beauty-care',
    name: '胺基酸潔面乳',
    slug: 'amino-cleanser',
    priceLabel: 'HK$149',
    imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-010',
    categoryId: 'beauty-care',
    name: '保濕修護精華',
    slug: 'hydration-serum',
    priceLabel: 'HK$289',
    imageUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-011',
    categoryId: 'beauty-care',
    name: '植萃護手霜',
    slug: 'botanic-hand-cream',
    priceLabel: 'HK$98',
    imageUrl: 'https://images.unsplash.com/photo-1611078489935-0cb964de46d6?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-012',
    categoryId: 'beauty-care',
    name: '舒眠精油',
    slug: 'sleep-essential-oil',
    priceLabel: 'HK$176',
    imageUrl: 'https://images.unsplash.com/photo-1600181950730-1897ce65ea79?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-013',
    categoryId: 'digital-goods',
    name: '磁吸無線充電座',
    slug: 'magnetic-charger',
    priceLabel: 'HK$259',
    imageUrl: 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-014',
    categoryId: 'digital-goods',
    name: '機械鍵盤 75%',
    slug: 'keyboard-75',
    priceLabel: 'HK$699',
    imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-015',
    categoryId: 'digital-goods',
    name: '可調式螢幕支架',
    slug: 'monitor-stand',
    priceLabel: 'HK$358',
    imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'p-016',
    categoryId: 'digital-goods',
    name: '降噪藍牙耳機',
    slug: 'anc-headphones',
    priceLabel: 'HK$899',
    imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80',
  },
]
