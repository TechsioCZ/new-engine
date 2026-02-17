import type { HttpTypes } from "@medusajs/types";
import { HerbatikaProductCard } from "@/components/herbatika-product-card";

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
    <div className="grid grid-cols-2 gap-300 xl:grid-cols-3">
      {products.map((product) => (
        <HerbatikaProductCard
          isAdding={isProductAdding(product.id)}
          key={product.id}
          onAddToCart={onAddToCart}
          onProductHoverEnd={onProductHoverEnd}
          onProductHoverStart={onProductHoverStart}
          product={product}
        />
      ))}
    </div>
  );
}
