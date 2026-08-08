"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import { ProductReviewForm } from "@/components/reviews/product-review-form"
import type { ProductReviewFormSubmitValues } from "@/components/reviews/product-review-form"

const REVIEW_FORM_ID = "product-detail-create-review-form"

export const ProductReviewDialogContent = ({
  formResetKey,
  authState,
  isBusy,
  isSubmitted,
  onSubmit,
  submitError,
}: {
  formResetKey: number
  authState: "authenticated" | "loading" | "unauthenticated"
  isBusy: boolean
  isSubmitted: boolean
  onSubmit: (values: ProductReviewFormSubmitValues) => void
  submitError: string | null
}) => {
  const tCatalog = useTranslations("catalog")
  if (authState === "loading") {
    return (
      <StatusText showIcon status="default">
        {tCatalog("reviews.auth_checking")}
      </StatusText>
    )
  }
  if (authState === "unauthenticated") {
    return (
      <StatusText showIcon status="warning">
        {tCatalog("reviews.sign_in_required")}
      </StatusText>
    )
  }
  if (isSubmitted) {
    return (
      <StatusText showIcon status="success">
        {tCatalog("reviews.submit_success")}
      </StatusText>
    )
  }
  return (
    <ProductReviewForm
      disabled={isBusy}
      formId={REVIEW_FORM_ID}
      onSubmit={onSubmit}
      resetKey={formResetKey}
      submitError={submitError}
    />
  )
}

export const ProductReviewDialogActions = ({
  authState,
  isBusy,
  isSubmitted,
  loginHref,
  onClose,
}: {
  authState: "authenticated" | "loading" | "unauthenticated"
  isBusy: boolean
  isSubmitted: boolean
  loginHref: string
  onClose: () => void
}) => {
  const tAuth = useTranslations("auth")
  const tCatalog = useTranslations("catalog")
  if (authState === "unauthenticated") {
    return (
      <>
        <Button
          onClick={onClose}
          size="sm"
          theme="outlined"
          variant="secondary"
        >
          {tCatalog("reviews.close")}
        </Button>
        <LinkButton as={NextLink} href={loginHref} size="sm" variant="primary">
          {tAuth("sign_in")}
        </LinkButton>
      </>
    )
  }
  if (isSubmitted) {
    return (
      <Button onClick={onClose} size="sm" variant="primary">
        {tCatalog("reviews.close")}
      </Button>
    )
  }
  return (
    <>
      <Button
        disabled={isBusy}
        onClick={onClose}
        size="sm"
        theme="outlined"
        type="button"
        variant="secondary"
      >
        {tCatalog("reviews.cancel")}
      </Button>
      <Button
        disabled={authState !== "authenticated" || isBusy}
        form={REVIEW_FORM_ID}
        isLoading={isBusy}
        loadingText={tCatalog("reviews.submitting")}
        size="sm"
        type="submit"
        variant="primary"
      >
        {tCatalog("reviews.submit")}
      </Button>
    </>
  )
}
