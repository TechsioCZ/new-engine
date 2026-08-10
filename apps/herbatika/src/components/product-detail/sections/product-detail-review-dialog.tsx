"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Dialog } from "@techsio/ui-kit/molecules/dialog"
import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { buildAuthRouteHref } from "@/components/auth/auth-helpers"
import {
  ProductReviewDialogActions,
  ProductReviewDialogContent,
} from "@/components/product-detail/sections/product-detail-review-dialog-content"
import { PRODUCT_DETAIL_REVIEWS_SECTION_ID } from "@/components/product-detail/sections/product-detail-review-utils"
import {
  resolveProductReviewSubmitErrorMessage,
  translateProductReviewErrorMessages,
} from "@/components/reviews/product-review-errors"
import type { ProductReviewFormSubmitValues } from "@/components/reviews/product-review-form"
import { useAuth } from "@/lib/storefront/auth"
import { useCreateProductReview } from "@/lib/storefront/reviews"

interface ProductReviewCreateDialogProps {
  productId: string
  triggerLabel?: string
}

type ReviewDialogAuthState = "authenticated" | "loading" | "unauthenticated"

const resolveAuthState = (
  isLoading: boolean,
  isAuthenticated: boolean,
): ReviewDialogAuthState => {
  if (isLoading) {
    return "loading"
  }
  return isAuthenticated ? "authenticated" : "unauthenticated"
}

export const ProductReviewCreateDialog = ({
  productId,
  triggerLabel,
}: ProductReviewCreateDialogProps) => {
  const tCatalog = useTranslations("catalog")
  const authQuery = useAuth()
  const pathname = usePathname()
  const [formResetKey, setFormResetKey] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const reviewErrorMessages = translateProductReviewErrorMessages(tCatalog)
  const createReviewMutation = useCreateProductReview({
    onError: (error) => {
      setSubmitError(
        resolveProductReviewSubmitErrorMessage(error, reviewErrorMessages),
      )
    },
    onSuccess: () => {
      setFormResetKey((current) => current + 1)
      setIsSubmitted(true)
      setSubmitError(null)
    },
  })
  const { isAuthenticated } = authQuery
  const authState = resolveAuthState(authQuery.isLoading, isAuthenticated)
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
  const closeDialog = () => {
    setIsOpen(false)
  }
  const loginHref = buildAuthRouteHref(
    "/auth/login",
    `${pathname}#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`,
  )

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true)
        }}
        size="sm"
        type="button"
        variant="primary"
      >
        {triggerLabel ?? tCatalog("reviews.write_action")}
      </Button>
      <Dialog
        actions={
          <ProductReviewDialogActions
            authState={authState}
            isBusy={isBusy}
            isSubmitted={isSubmitted}
            loginHref={loginHref}
            onClose={closeDialog}
          />
        }
        className="shadow-md"
        customTrigger
        description={tCatalog("reviews.pending_description")}
        onOpenChange={handleOpenChange}
        open={isOpen}
        size="md"
        title={tCatalog("reviews.dialog_title")}
      >
        <ProductReviewDialogContent
          formResetKey={formResetKey}
          authState={authState}
          isBusy={isBusy}
          isSubmitted={isSubmitted}
          onSubmit={handleSubmit}
          submitError={submitError}
        />
      </Dialog>
    </>
  )
}
