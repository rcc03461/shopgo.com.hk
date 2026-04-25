export type LandingCta = {
  label: string
  to: string
}

export type LandingHero = {
  badge: string
  title: string
  subtitle: string
  primaryCta: LandingCta
  secondaryCta: LandingCta
}

export type LandingSlide = {
  id: string
  title: string
  description: string
  imageUrl: string
  cta?: LandingCta
}

export type LandingCategory = {
  id: string
  label: string
}

export type LandingProductCard = {
  id: string
  categoryId: string
  name: string
  title?: string
  slug: string
  priceLabel: string
  imageUrl: string
  coverUrl?: string | null
  displayPrice?: string
  originalPrice?: string | null
  hasVariants?: boolean
}
