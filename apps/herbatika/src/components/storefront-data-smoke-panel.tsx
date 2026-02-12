"use client";

import { useRegionContext } from "@techsio/storefront-data/shared";
import { Badge } from "@techsio/ui-kit/atoms/badge";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { useState } from "react";
import {
  useAddLineItem,
  useCart,
  useRemoveLineItem,
} from "@/lib/storefront/cart";
import {
  useCheckoutPayment,
  useCheckoutShipping,
} from "@/lib/storefront/checkout";
import { useProduct, useProducts } from "@/lib/storefront/products";
import { useRegions } from "@/lib/storefront/regions";

const sectionClassName = "rounded-xl border border-black/10 bg-white p-4";

export function StorefrontDataSmokePanel() {
  const region = useRegionContext();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const { regions, isLoading: isRegionsLoading } = useRegions({
    fields: "id,name,currency_code,countries.*",
    limit: 20,
  });

  const productsQuery = useProducts({
    page: 1,
    limit: 12,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(region?.region_id),
  });

  const firstProduct = productsQuery.products[0] ?? null;
  const firstProductHandle = firstProduct?.handle ?? "";
  const firstVariantId = firstProduct?.variants?.[0]?.id;

  const productDetailQuery = useProduct({
    handle: firstProductHandle,
    region_id: region?.region_id,
    country_code: region?.country_code,
    enabled: Boolean(firstProductHandle && region?.region_id),
  });

  const cartQuery = useCart({
    region_id: region?.region_id,
    country_code: region?.country_code,
    autoCreate: true,
    enabled: Boolean(region?.region_id),
  });

  const addLineItem = useAddLineItem();
  const removeLineItem = useRemoveLineItem();

  const firstLineItemId = cartQuery.cart?.items?.[0]?.id;

  const checkoutShippingQuery = useCheckoutShipping({
    cartId: cartQuery.cart?.id,
    cart: cartQuery.cart,
    enabled: Boolean(cartQuery.cart?.id),
  });

  const checkoutPaymentQuery = useCheckoutPayment({
    cartId: cartQuery.cart?.id,
    cart: cartQuery.cart,
    regionId: cartQuery.cart?.region_id ?? region?.region_id,
    enabled: Boolean(cartQuery.cart?.region_id ?? region?.region_id),
  });

  const handleAddToCart = async () => {
    setMutationError(null);

    if (!firstVariantId) {
      setMutationError("Není dostupná varianta produktu pro add-to-cart test.");
      return;
    }

    try {
      await addLineItem.mutateAsync({
        cartId: cartQuery.cart?.id,
        variantId: firstVariantId,
        quantity: 1,
        autoCreate: true,
        region_id: region?.region_id,
        country_code: region?.country_code,
      });
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "Add-to-cart test selhal.",
      );
    }
  };

  const handleRemoveFirstItem = async () => {
    setMutationError(null);

    if (!firstLineItemId) {
      setMutationError("Košík neobsahuje položku pro remove test.");
      return;
    }

    try {
      await removeLineItem.mutateAsync({
        cartId: cartQuery.cart?.id,
        lineItemId: firstLineItemId,
      });
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "Remove item test selhal.",
      );
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Storefront data smoke test</h1>
        <p className="text-sm text-black/70">
          Ověření fáze 1: products list/detail, cart create/add/remove, checkout
          shipping a payment providers.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        <Badge variant={region?.region_id ? "success" : "warning"}>
          {`region: ${region?.region_id ? "ready" : "missing"}`}
        </Badge>
        <Badge variant={productsQuery.products.length > 0 ? "success" : "info"}>
          {`products: ${productsQuery.products.length}`}
        </Badge>
        <Badge variant={cartQuery.cart?.id ? "success" : "warning"}>
          {`cart: ${cartQuery.cart?.id ? "ready" : "missing"}`}
        </Badge>
        <Badge
          variant={
            checkoutShippingQuery.shippingOptions.length > 0
              ? "success"
              : "info"
          }
        >
          {`shipping options: ${checkoutShippingQuery.shippingOptions.length}`}
        </Badge>
        <Badge
          variant={
            checkoutPaymentQuery.paymentProviders.length > 0
              ? "success"
              : "info"
          }
        >
          {`payment providers: ${checkoutPaymentQuery.paymentProviders.length}`}
        </Badge>
      </div>

      {mutationError && <ErrorText showIcon>{mutationError}</ErrorText>}
      {productsQuery.error && (
        <ErrorText showIcon>{productsQuery.error}</ErrorText>
      )}
      {cartQuery.error && <ErrorText showIcon>{cartQuery.error}</ErrorText>}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className={sectionClassName}>
          <h2 className="mb-2 text-lg font-semibold">Region + products</h2>
          {isRegionsLoading ? (
            <Skeleton>
              <Skeleton.Text noOfLines={3} />
            </Skeleton>
          ) : (
            <div className="space-y-1 text-sm">
              <p>Regions loaded: {regions.length}</p>
              <p>Active region id: {region?.region_id ?? "-"}</p>
              <p>Active country code: {region?.country_code ?? "-"}</p>
              <p>First product handle: {firstProductHandle || "-"}</p>
              <p>
                Product detail loaded:{" "}
                {productDetailQuery.product ? "yes" : "no"}
              </p>
            </div>
          )}
        </article>

        <article className={sectionClassName}>
          <h2 className="mb-2 text-lg font-semibold">Cart + checkout data</h2>
          {cartQuery.isLoading ? (
            <Skeleton>
              <Skeleton.Text noOfLines={3} />
            </Skeleton>
          ) : (
            <div className="space-y-1 text-sm">
              <p>Cart id: {cartQuery.cart?.id ?? "-"}</p>
              <p>Item count: {cartQuery.itemCount}</p>
              <p>
                Shipping options loaded:{" "}
                {checkoutShippingQuery.shippingOptions.length}
              </p>
              <p>
                Payment providers loaded:{" "}
                {checkoutPaymentQuery.paymentProviders.length}
              </p>
            </div>
          )}
        </article>
      </section>

      <section className={sectionClassName}>
        <h2 className="mb-3 text-lg font-semibold">Mutation tests (cart)</h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleAddToCart}
            disabled={!firstVariantId || addLineItem.isPending}
            isLoading={addLineItem.isPending}
          >
            Add first variant to cart
          </Button>

          <Button
            variant="secondary"
            theme="outlined"
            onClick={handleRemoveFirstItem}
            disabled={!firstLineItemId || removeLineItem.isPending}
            isLoading={removeLineItem.isPending}
          >
            Remove first cart item
          </Button>
        </div>
      </section>
    </main>
  );
}
