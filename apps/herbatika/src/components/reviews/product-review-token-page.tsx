"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";
import { useMemo, useState } from "react";
import {
  ProductReviewForm,
  type ProductReviewFormSubmitValues,
} from "@/components/reviews/product-review-form";
import { resolveProductReviewSubmitErrorMessage } from "@/components/reviews/product-review-errors";
import {
  type ProductReviewTokenProductStatus,
  resolveProductStatusMessage,
} from "@/components/reviews/product-review-token-status";
import { useCreateProductReview } from "@/lib/storefront/reviews";
import { useProducts } from "@/lib/storefront/products";

type ProductReviewTokenPageProps = {
  productId?: string;
  token: string;
};

const REVIEW_TOKEN_FORM_ID = "product-review-token-form";
const REVIEW_TOKEN_PRODUCT_FIELDS = "id,title,handle";

export function ProductReviewTokenPage({
  productId,
  token,
}: ProductReviewTokenPageProps) {
  const normalizedProductId = productId?.trim() ?? "";
  const [formResetKey, setFormResetKey] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const productQuery = useProducts({
    page: 1,
    limit: 1,
    id: normalizedProductId || undefined,
    fields: REVIEW_TOKEN_PRODUCT_FIELDS,
    enabled: Boolean(normalizedProductId),
  });
  const product = productQuery.products[0] ?? null;
  const productHref = product?.handle ? `/p/${product.handle}` : null;
  const backHref = productHref ?? "/";
  const backLabel = productHref ? "Späť na produkt" : "Späť do obchodu";
  const createReviewMutation = useCreateProductReview({
    onError: (error) => {
      setSubmitError(resolveProductReviewSubmitErrorMessage(error));
    },
    onSuccess: () => {
      setFormResetKey((current) => current + 1);
      setIsSubmitted(true);
      setSubmitError(null);
    },
  });
  const isBusy = createReviewMutation.isPending;
  const productStatus = useMemo<ProductReviewTokenProductStatus>(() => {
    if (!normalizedProductId) {
      return "missing-product-id";
    }

    if (productQuery.isLoading) {
      return "loading";
    }

    if (productQuery.error) {
      return "error";
    }

    if (!product) {
      return "not-found";
    }

    return "ready";
  }, [
    normalizedProductId,
    product,
    productQuery.error,
    productQuery.isLoading,
  ]);
  const productStatusMessage = resolveProductStatusMessage(productStatus);

  const handleSubmit = ({
    content,
    rating,
    title,
  }: ProductReviewFormSubmitValues) => {
    if (!normalizedProductId) {
      setSubmitError("Odkaz na hodnotenie neobsahuje produkt.");
      return;
    }

    setSubmitError(null);

    createReviewMutation.mutate({
      content,
      product_id: normalizedProductId,
      rating,
      review_token: token,
      title,
    });
  };

  return (
    <main className="mx-auto flex w-full max-w-max-w flex-col gap-500 p-product-detail-page font-rubik 2xl:p-product-detail-page-lg">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-400 rounded-sm border border-border-secondary bg-surface p-500 shadow-sm sm:p-600">
        <header className="space-y-150">
          <p className="font-semibold text-fg-secondary text-sm">
            Hodnotenie nákupu
          </p>
          <h1 className="font-bold text-2xl text-fg-primary">
            Napísať recenziu
          </h1>
          <p className="text-fg-secondary text-sm">
            Recenzia sa zobrazí po schválení.
          </p>
        </header>

        {productStatus === "missing-product-id" ? (
          <StatusText showIcon status="error">
            Odkaz na hodnotenie neobsahuje produkt.
          </StatusText>
        ) : null}

        {productStatusMessage ? (
          <StatusText showIcon status={productStatusMessage.status}>
            {productStatusMessage.text}
          </StatusText>
        ) : null}

        {product ? (
          <div className="space-y-100 border-border-secondary border-y py-300">
            <p className="text-fg-secondary text-sm">Hodnotený produkt</p>
            {productHref ? (
              <NextLink
                className="font-semibold text-fg-primary underline underline-offset-2"
                href={productHref}
              >
                {product.title}
              </NextLink>
            ) : (
              <p className="font-semibold text-fg-primary">{product.title}</p>
            )}
          </div>
        ) : null}

        {isSubmitted ? (
          <div className="space-y-300">
            <StatusText showIcon status="success">
              Ďakujeme za recenziu. Po schválení sa zobrazí pri produkte.
            </StatusText>
            <LinkButton as={NextLink} href={backHref} variant="primary" size="md">
              {backLabel}
            </LinkButton>
          </div>
        ) : null}

        {!isSubmitted && normalizedProductId ? (
          <>
            <ProductReviewForm
              disabled={isBusy}
              formId={REVIEW_TOKEN_FORM_ID}
              onSubmit={handleSubmit}
              resetKey={formResetKey}
              submitError={submitError}
            />
            <div className="flex flex-col gap-200 sm:flex-row sm:items-center">
              <Button
                disabled={isBusy}
                form={REVIEW_TOKEN_FORM_ID}
                isLoading={isBusy}
                type="submit"
                variant="primary"
              >
                Odoslať recenziu
              </Button>
              <LinkButton
                as={NextLink}
                href={backHref}
                theme="outlined"
                variant="secondary"
                size="md"
              >
                {backLabel}
              </LinkButton>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
