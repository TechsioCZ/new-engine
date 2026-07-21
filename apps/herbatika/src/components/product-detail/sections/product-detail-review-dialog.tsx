"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { buildAuthRouteHref } from "@/components/auth/auth-helpers"
import { PRODUCT_DETAIL_REVIEWS_SECTION_ID } from "@/components/product-detail/sections/product-detail-review-utils"
import {
  resolveProductReviewSubmitErrorMessage,
  translateProductReviewErrorMessages,
} from "@/components/reviews/product-review-errors"
import {
  ProductReviewForm,
  type ProductReviewFormSubmitValues,
} from "@/components/reviews/product-review-form"
import { useAuth } from "@/lib/storefront/auth"
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
  const tAuth = useTranslations("auth")
  const tCatalog = useTranslations("catalog")
  const resolvedTriggerLabel =
    triggerLabel ?? tCatalog("reviews.write_action")
  const reviewErrorMessages = translateProductReviewErrorMessages(tCatalog)
  const authQuery = useAuth()
  const pathname = usePathname()
  const [formResetKey, setFormResetKey] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const loginHref = buildAuthRouteHref(
    "/auth/login",
    `${pathname}#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`
  )
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
  const isAuthenticated = authQuery.isAuthenticated

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
    rating,
    title,
  }: ProductReviewFormSubmitValues) => {
    setSubmitError(null)

    createReviewMutation.mutate({
      content,
      product_id: productId,
      rating,
      title,
    })
  }

  const renderContent = () => {
    if (authQuery.isLoading) {
      return (
        <StatusText showIcon status="default">
          {tCatalog("reviews.auth_checking")}
        </StatusText>
      )
    }

    if (!isAuthenticated) {
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
        onSubmit={handleSubmit}
        resetKey={formResetKey}
        submitError={submitError}
      />
    )
  }

  const renderActions = () => {
    if (!(isAuthenticated || authQuery.isLoading)) {
      return (
        <>
          <Button
            onClick={() => setIsOpen(false)}
            size="sm"
            theme="outlined"
            variant="secondary"
          >
            {tCatalog("reviews.close")}
          </Button>
          <LinkButton
            as={NextLink}
            href={loginHref}
            size="sm"
            variant="primary"
          >
            {tAuth("sign_in")}
          </LinkButton>
        </>
      )
    }

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
          disabled={!isAuthenticated || authQuery.isLoading || isBusy}
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
