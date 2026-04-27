import { storefront } from "@/hooks/storefront-preset"
import { transformProduct } from "@/utils/transform/transform-product"
import { ProductGrid } from "../molecules/product-grid"

type RelatedProductsProps = {
  categories?: string[]
}

export const RelatedProducts = ({ categories }: RelatedProductsProps) => {
  if (!categories?.length) {
    return null
  }

  return <RelatedProductsContent categories={categories} />
}

function RelatedProductsContent({ categories }: { categories: string[] }) {
  const { products: rawProducts } = storefront.hooks.products.useProducts(
    {
      category_id: categories,
      limit: 4,
    }
  )

  if (rawProducts.length === 0) {
    return null
  }

  const products = rawProducts.map(transformProduct)

  return (
    <div>
      <h3 className="font-bold text-lg">PODOBNÉ PRODUKTY</h3>
      <div className="flex max-w-max-w justify-around">
        <ProductGrid products={products} />
      </div>
    </div>
  )
}
