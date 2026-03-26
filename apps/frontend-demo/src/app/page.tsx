"use client"

import { useEffect, useMemo } from "react"
import { ProductGridSkeleton } from "@/components/molecules/product-grid-skeleton"
import { SaleBanner } from "@/components/molecules/sale-banner"
import { CategoryGrid } from "@/components/organisms/category-grid"
import { Hero } from "@/components/organisms/hero"
import { ProductGrid } from "@/components/organisms/product-grid"
import { homeCategoryConfigs, homeContent } from "@/data/home-content"
import { useCategoryRegistry } from "@/hooks/use-category-registry"
import { usePrefetchProducts } from "@/hooks/use-prefetch-products"
import { useProducts } from "@/hooks/use-products"
import { useRegions } from "@/hooks/use-region"
import {
  getCategoryIdByHandle,
  getCategoryIdsByHandles,
} from "@/lib/categories/selectors"
import homeImage from "../../assets/hero/home.webp"

export default function Home() {
  const { prefetchDefaultProducts } = usePrefetchProducts()
  const { selectedRegion } = useRegions()
  const { categoryRegistry, isSuccess: hasCategoryRegistry } =
    useCategoryRegistry()
  const {
    hero,
    trending,
    categories: categoriesSection,
    saleBanner,
    newArrivals,
  } = homeContent
  const trendingCategoryId = getCategoryIdByHandle(
    categoryRegistry,
    "kratke-rukavy"
  )
  const homeCategories = useMemo(
    () =>
      homeCategoryConfigs.map((category) => ({
        name: category.name,
        imageUrl: category.imageUrl,
        description: category.description,
        leaves: getCategoryIdsByHandles(categoryRegistry, category.handles),
      })),
    [categoryRegistry]
  )
  const { products, isLoading } = useProducts({
    q: "triko",
    sort: "newest",
    limit: 8,
    category: trendingCategoryId,
    region_id: selectedRegion?.id,
    enabled: Boolean(selectedRegion?.id && trendingCategoryId),
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      prefetchDefaultProducts()
    }, 100)
    return () => clearTimeout(timer)
  }, [prefetchDefaultProducts])

  const featuredProducts = products.slice(0, 4)
  const newProductsList = products.slice(4, 8)

  return (
    <div>
      <Hero
        backgroundImage={homeImage}
        primaryAction={hero.primaryAction}
        secondaryAction={hero.secondaryAction}
        subtitle={hero.subtitle}
        title={hero.title}
      />

      <div className="mx-auto max-w-layout-max px-4 py-16">
        <div className="mb-4 flex flex-col">
          <h2 className="font-bold text-featured-title text-featured-title-size">
            {trending.title}
          </h2>
          {trending.subtitle && (
            <p className="text-featured-subtitle">{trending.subtitle}</p>
          )}
        </div>
        {isLoading ? (
          <ProductGridSkeleton numberOfItems={4} />
        ) : (
          <ProductGrid products={featuredProducts} />
        )}
      </div>

      {hasCategoryRegistry && (
        <CategoryGrid
          categories={homeCategories}
          subtitle={categoriesSection.subtitle}
          title={categoriesSection.title}
        />
      )}

      <SaleBanner
        backgroundImage={saleBanner.backgroundImage}
        linkHref={saleBanner.linkHref}
        linkText={saleBanner.linkText}
        subtitle={saleBanner.subtitle}
        title={saleBanner.title}
      />

      <div className="mx-auto max-w-layout-max px-4 py-16">
        <div className="mb-4 flex flex-col">
          <h2 className="font-bold text-featured-title text-featured-title-size">
            {newArrivals.title}
          </h2>
          {newArrivals.subtitle && (
            <p className="text-featured-subtitle">{newArrivals.subtitle}</p>
          )}
        </div>
        {isLoading ? (
          <ProductGridSkeleton numberOfItems={4} />
        ) : (
          <ProductGrid products={newProductsList} />
        )}
      </div>
    </div>
  )
}
