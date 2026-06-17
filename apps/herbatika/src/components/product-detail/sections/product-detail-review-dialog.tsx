"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import NextLink from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { buildAuthRouteHref } from "@/components/auth/auth-helpers"
import { PRODUCT_DETAIL_REVIEWS_SECTION_ID } from "@/components/product-detail/sections/product-detail-review-utils"
import { resolveProductReviewSubmitErrorMessage } from "@/components/reviews/product-review-errors"
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
  triggerLabel = "Napísať recenziu",
}: ProductReviewCreateDialogProps) {
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
      setSubmitError(resolveProductReviewSubmitErrorMessage(error))
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
          Overujem prihlásenie.
        </StatusText>
      )
    }

    if (!isAuthenticated) {
      return (
        <StatusText showIcon status="warning">
          Na napísanie recenzie sa prosím prihláste.
        </StatusText>
      )
    }

    if (isSubmitted) {
      return (
        <StatusText showIcon status="success">
          Ďakujeme za recenziu. Po schválení sa zobrazí pri produkte.
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
            Zavrieť
          </Button>
          <LinkButton
            as={NextLink}
            href={loginHref}
            size="sm"
            variant="primary"
          >
            Prihlásiť sa
          </LinkButton>
        </>
      )
    }

    if (isSubmitted) {
      return (
        <Button onClick={() => setIsOpen(false)} size="sm" variant="primary">
          Zavrieť
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
          Zrušiť
        </Button>
        <Button
          disabled={!isAuthenticated || authQuery.isLoading || isBusy}
          form={REVIEW_FORM_ID}
          isLoading={isBusy}
          size="sm"
          type="submit"
          variant="primary"
        >
          Odoslať recenziu
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
        {triggerLabel}
      </Button>
      <Dialog
        actions={renderActions()}
        className="shadow-md"
        customTrigger
        description="Recenzia sa zobrazí po schválení."
        onOpenChange={handleOpenChange}
        open={isOpen}
        size="md"
        title="Napísať recenziu"
      >
        {renderContent()}
      </Dialog>
    </>
  )
}
