"use client"

import { Rating } from "@techsio/ui-kit/atoms/rating"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea"
import { useTranslations } from "next-intl"
import { type FormEvent, useCallback, useEffect, useState } from "react"
import {
  createProductReviewFormSubmission,
  type ProductReviewFormErrors,
  type ProductReviewFormSubmitValues,
  type ProductReviewFormValues,
  REVIEW_AUTHOR_NAME_MAX_LENGTH,
  REVIEW_CONTENT_MIN_LENGTH,
  validateProductReviewForm,
} from "@/components/reviews/product-review-form.utils"
import {
  isProductReviewTurnstileEnabled,
  ProductReviewTurnstile,
} from "@/components/reviews/product-review-turnstile"

export type { ProductReviewFormSubmitValues } from "@/components/reviews/product-review-form.utils"

type ProductReviewFormProps = {
  disabled?: boolean
  formId: string
  requireAuthorName?: boolean
  resetKey?: number
  submitError?: string | null
  onSubmit: (values: ProductReviewFormSubmitValues) => void
}

const defaultValues: ProductReviewFormValues = {
  authorName: "",
  content: "",
  rating: null,
  turnstileToken: null,
}

export function ProductReviewForm({
  disabled = false,
  formId,
  requireAuthorName = false,
  resetKey,
  submitError,
  onSubmit,
}: ProductReviewFormProps) {
  const tCatalog = useTranslations("catalog")
  const [captchaResetKey, setCaptchaResetKey] = useState(0)
  const [errors, setErrors] = useState<ProductReviewFormErrors>({})
  const [values, setValues] = useState<ProductReviewFormValues>(defaultValues)

  // biome-ignore lint/correctness/useExhaustiveDependencies: `resetKey` is an intentional reset trigger — the parent bumps it to restore the form to defaults; the effect body doesn't read it.
  useEffect(() => {
    setErrors({})
    setValues(defaultValues)
    setCaptchaResetKey((current) => current + 1)
  }, [resetKey])

  const handleTurnstileTokenChange = useCallback((token: string | null) => {
    setValues((current) => ({
      ...current,
      turnstileToken: token,
    }))
    setErrors((current) => ({ ...current, turnstileToken: undefined }))
  }, [])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextErrors = validateProductReviewForm(values, {
      messages: {
        authorNameRequired: tCatalog("reviews.form.author_name_validation"),
        captchaRequired: tCatalog("reviews.form.captcha_validation"),
        contentMinLength: tCatalog(
          "reviews.form.content_min_length_validation",
          {
            min: REVIEW_CONTENT_MIN_LENGTH,
          }
        ),
        ratingRequired: tCatalog("reviews.form.rating_validation"),
      },
      requireAuthorName,
      requireTurnstile: isProductReviewTurnstileEnabled,
    })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const rating = values.rating

    if (typeof rating !== "number") {
      return
    }

    onSubmit(createProductReviewFormSubmission({ ...values, rating }))
    setCaptchaResetKey((current) => current + 1)
  }

  return (
    <form
      className="space-y-300"
      id={formId}
      noValidate
      onSubmit={handleSubmit}
    >
      {submitError ? (
        <StatusText showIcon status="error">
          {submitError}
        </StatusText>
      ) : null}

      {requireAuthorName ? (
        <FormInput
          autoComplete="name"
          disabled={disabled}
          helpText={errors.authorName}
          id={`${formId}-author-name`}
          label={tCatalog("reviews.form.author_name_label")}
          maxLength={REVIEW_AUTHOR_NAME_MAX_LENGTH}
          name="review-author-name"
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              authorName: event.target.value,
            }))
            setErrors((current) => ({ ...current, authorName: undefined }))
          }}
          required
          validateStatus={errors.authorName ? "error" : "default"}
          value={values.authorName}
        />
      ) : null}

      <div className="flex flex-col gap-form-field-gap">
        <Rating
          allowHalf={false}
          disabled={disabled}
          id={`${formId}-rating`}
          labelText={tCatalog("reviews.form.rating_label")}
          name="rating"
          onChange={(rating) => {
            setValues((current) => ({
              ...current,
              rating: rating > 0 ? rating : null,
            }))
            setErrors((current) => ({ ...current, rating: undefined }))
          }}
          size="lg"
          value={values.rating ?? undefined}
        />
        {errors.rating ? (
          <StatusText showIcon status="error">
            {errors.rating}
          </StatusText>
        ) : null}
      </div>

      <FormTextarea
        disabled={disabled}
        helpText={
          errors.content ??
          tCatalog("reviews.form.content_min_length_help", {
            min: REVIEW_CONTENT_MIN_LENGTH,
          })
        }
        id={`${formId}-content`}
        label={tCatalog("reviews.form.content_label")}
        maxLength={1000}
        onChange={(event) => {
          setValues((current) => ({
            ...current,
            content: event.target.value,
          }))
          setErrors((current) => ({ ...current, content: undefined }))
        }}
        required
        resize="y"
        rows={5}
        validateStatus={errors.content ? "error" : "default"}
        value={values.content}
      />

      <ProductReviewTurnstile
        errorMessage={errors.turnstileToken}
        label={tCatalog("reviews.form.captcha_label")}
        onTokenChange={handleTurnstileTokenChange}
        resetKey={captchaResetKey}
        unavailableMessage={tCatalog("reviews.form.captcha_unavailable")}
      />
    </form>
  )
}
