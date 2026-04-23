"use client";

import type { HttpTypes } from "@medusajs/types";
import { InlineProductsCarousel } from "@/components/blog/inline-products-carousel";
import { useCheckoutInlineProducts } from "@/components/checkout/use-checkout-inline-products";

type CheckoutInlineProductsSectionProps = {
  cartItems: HttpTypes.StoreCartLineItem[];
};

export function CheckoutInlineProductsSection({
  cartItems,
}: CheckoutInlineProductsSectionProps) {
  const { isLoading, products } = useCheckoutInlineProducts(cartItems);

  if (isLoading || products.length === 0) {
    return null;
  }

  return (
    <section className="space-y-300">
      <h2 className="px-300 text-2xl leading-tight font-semibold text-fg-primary">
        Často kupované spolu
      </h2>

      <InlineProductsCarousel products={products} slidesLg={5} />
    </section>
  );
}
