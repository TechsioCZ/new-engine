"use client"
import { Suspense } from "react"
import { FeatureBlock } from "@/components/atoms/feature-block"
import { HeroCarousel } from "@/components/hero-carousel"
import { ProductGrid } from "@/components/molecules/product-grid"
import { TopProduct } from "@/components/top-product"
import { featureBlocks, heroCarouselSlides, topCategory } from "@/data/home"
import { leafCategories } from "@/data/static/categories"
import { useSuspenseProducts } from "@/hooks/use-products"
import { transformProduct } from "@/utils/transform/transform-product"

export default function Home() {
  return (
    <main className="grid justify-center">
      <section className="w-full">
        <HeroCarousel slides={heroCarouselSlides} />
      </section>

      <section className="mx-auto grid max-w-max-w grid-cols-2 px-section py-section md:grid-cols-[repeat(auto-fit,minmax(25%,1fr))]">
        {featureBlocks.map((block) => (
          <FeatureBlock
            key={`${block.maintText}-${block.subText}`}
            {...block}
          />
        ))}
      </section>

      <section className="bg-surface py-section">
        <div className="mx-auto flex w-full max-w-max-w flex-col gap-section px-section">
          <h2 className="text-center font-bold text-xl">TOP kategorie</h2>
          <div className="grid grid-cols-3 place-items-center gap-300 md:grid-cols-4">
            {topCategory.map((category) => (
              <TopProduct key={category.label} {...category} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto my-28 w-full max-w-max-w">
        <h2 className="relative mx-auto mb-section flex max-w-max-w items-center justify-center font-bold text-xl">
          <span className="relative z-10 bg-base px-400 text-fg-primary">
            Vybíráme pro vás
          </span>
          <span className="absolute inset-0 flex items-center">
            <span className="w-full border-border-secondary border-t" />
          </span>
        </h2>
        <Suspense
          fallback={<ProductGrid isLoading products={[]} skeletonCount={8} />}
        >
          <HomeProductGrid />
        </Suspense>
      </section>
    </main>
  )
}

function HomeProductGrid() {
  const featuredCategoryIds = leafCategories.length
    ? leafCategories.slice(0, 2).map((category) => category.id)
    : undefined

  if (!featuredCategoryIds) {
    return <ProductGrid products={[]} skeletonCount={8} />
  }

  return <FeaturedHomeProductGrid featuredCategoryIds={featuredCategoryIds} />
}

type FeaturedHomeProductGridProps = {
  featuredCategoryIds: string[]
}

function FeaturedHomeProductGrid({
  featuredCategoryIds,
}: FeaturedHomeProductGridProps) {
  const { products: rawProducts } = useSuspenseProducts({
    category_id: featuredCategoryIds,
    limit: 8,
  })

  const products = rawProducts.map(transformProduct)

  return <ProductGrid products={products} skeletonCount={8} />
}
