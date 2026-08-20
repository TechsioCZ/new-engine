"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useTranslations } from "next-intl"
import { useState } from "react"
import {
  resolveProductReviewSubmitErrorMessage,
  translateProductReviewErrorMessages,
} from "@/components/reviews/product-review-errors"
import {
  ProductReviewForm,
  type ProductReviewFormSubmitValues,
} from "@/components/reviews/product-review-form"
import { useCreateProductReview } from "@/lib/storefront/reviews"

type ProductReviewCreateDialogProps = {
  productId: string
  triggerLabel?: string
}

const REVIEW_FORM_ID = "product-detail-create-review-form"

export function ProductReviewCreateDialog({
  productId,
  triggerLabel,
}: ProductReviewCreateDialogProps) {
  const tCatalog = useTranslations("catalog")
  const resolvedTriggerLabel = triggerLabel ?? tCatalog("reviews.write_action")
  const reviewErrorMessages = translateProductReviewErrorMessages(tCatalog)
  const [formResetKey, setFormResetKey] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const createReviewMutation = useCreateProductReview({
    onError: (error) => {
      setSubmitError(
        resolveProductReviewSubmitErrorMessage(error, reviewErrorMessages)
      )
    },
    onSuccess: () => {
      setFormResetKey((current) => current + 1)
      setIsSubmitted(true)
      setSubmitError(null)
    },
  })
  const isBusy = createReviewMutation.isPending

  const handleOpenChange = ({ open }: { open: boolean }) => {
    setIsOpen(open)

    if (!open) {
      setFormResetKey((current) => current + 1)
      setIsSubmitted(false)
      setSubmitError(null)
    }
  }

  const handleSubmit = ({
    content,
    name,
    rating,
    turnstileToken,
  }: ProductReviewFormSubmitValues) => {
    setSubmitError(null)

    createReviewMutation.mutate({
      content,
      ...(name ? { name } : {}),
      product_id: productId,
      rating,
      ...(turnstileToken ? { turnstileToken } : {}),
    })
  }

  const renderContent = () => {
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
        onSubmit={handleSubmit}
        requireAuthorName
        resetKey={formResetKey}
        submitError={submitError}
      />
    )
  }

  const renderActions = () => {
    if (isSubmitted) {
      return (
        <Button onClick={() => setIsOpen(false)} size="sm" variant="primary">
          {tCatalog("reviews.close")}
        </Button>
      )
    }

    return (
      <>
        <Button
          disabled={isBusy}
          onClick={() => setIsOpen(false)}
          size="sm"
          theme="outlined"
          type="button"
          variant="secondary"
        >
          {tCatalog("reviews.cancel")}
        </Button>
        <Button
          disabled={isBusy}
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

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        size="sm"
        type="button"
        variant="primary"
      >
        {resolvedTriggerLabel}
      </Button>
      <Dialog
        actions={renderActions()}
        className="shadow-md"
        customTrigger
        description={tCatalog("reviews.pending_description")}
        onOpenChange={handleOpenChange}
        open={isOpen}
        size="md"
        title={tCatalog("reviews.dialog_title")}
      >
        {renderContent()}
      </Dialog>
    </>
  )
}
