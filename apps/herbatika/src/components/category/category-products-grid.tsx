import type { HttpTypes } from "@medusajs/types";
import { HerbatikaProductGrid } from "@/components/product/herbatika-product-grid";

type CategoryProductsGridProps = {
  products: HttpTypes.StoreProduct[];
  isProductAdding: (productId: string) => boolean;
  onAddToCart: (product: HttpTypes.StoreProduct) => Promise<void>;
  onProductHoverStart: (product: HttpTypes.StoreProduct) => void;
  onProductHoverEnd: (product: HttpTypes.StoreProduct) => void;
};

export function CategoryProductsGrid({
  products,
  isProductAdding,
  onAddToCart,
  onProductHoverStart,
  onProductHoverEnd,
}: CategoryProductsGridProps) {
  return (
    <HerbatikaProductGrid
      isProductAdding={(product) => isProductAdding(product.id)}
      keyPrefix="category-product"
      layout="category"
      onAddToCart={onAddToCart}
      onProductHoverEnd={onProductHoverEnd}
      onProductHoverStart={onProductHoverStart}
      products={products}
    />
  );
}
