"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"

import NextLink from "@/components/app-link"
import { ProductReviewForm } from "@/components/reviews/product-review-form"
import type { ProductReviewFormSubmitValues } from "@/components/reviews/product-review-form"

const REVIEW_TOKEN_FORM_ID = "product-review-token-form"

interface ProductReviewTokenSubmissionProps {
  backHref: string
  backLabel: string
  formResetKey: number
  isBusy: boolean
  isSubmitted: boolean
  onSubmit: (values: ProductReviewFormSubmitValues) => void
  submitError: string | null
}

export const ProductReviewTokenSubmission = ({
  backHref,
  backLabel,
  formResetKey,
  isBusy,
  isSubmitted,
  onSubmit,
  submitError,
}: ProductReviewTokenSubmissionProps) => {
  const tCatalog = useTranslations("catalog")

  if (isSubmitted) {
    return (
      <div className="space-y-300">
        <StatusText showIcon status="success">
          {tCatalog("reviews.submit_success")}
        </StatusText>
        <LinkButton as={NextLink} href={backHref} size="md" variant="primary">
          {backLabel}
        </LinkButton>
      </div>
    )
  }

  return (
    <>
      <ProductReviewForm
        disabled={isBusy}
        formId={REVIEW_TOKEN_FORM_ID}
        onSubmit={onSubmit}
        resetKey={formResetKey}
        submitError={submitError}
      />
      <div className="flex flex-col gap-200 sm:flex-row sm:items-center">
        <Button
          disabled={isBusy}
          form={REVIEW_TOKEN_FORM_ID}
          isLoading={isBusy}
          loadingText={tCatalog("reviews.submitting")}
          type="submit"
          variant="primary"
        >
          {tCatalog("reviews.submit")}
        </Button>
        <LinkButton
          as={NextLink}
          href={backHref}
          size="md"
          theme="outlined"
          variant="secondary"
        >
          {backLabel}
        </LinkButton>
      </div>
    </>
  )
}
