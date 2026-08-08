"use client"

import { Rating } from "@techsio/ui-kit/atoms/rating"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea"
import { useTranslations } from "next-intl"
import { useState } from "react"
import type { ChangeEvent, SyntheticEvent } from "react"

import { buildProductReviewTitle } from "@/components/reviews/product-review-errors"
import {
  DEFAULT_PRODUCT_REVIEW_FORM_VALUES,
  REVIEW_CONTENT_MIN_LENGTH,
  validateProductReviewForm,
} from "@/components/reviews/product-review-form-validation"
import type {
  ProductReviewFormErrors,
  ProductReviewFormSubmitValues,
  ProductReviewFormValues,
} from "@/components/reviews/product-review-form-validation"

export type { ProductReviewFormSubmitValues } from "@/components/reviews/product-review-form-validation"

interface ProductReviewFormProps {
  disabled?: boolean
  formId: string
  resetKey?: number
  submitError?: string | null
  onSubmit: (values: ProductReviewFormSubmitValues) => void
}

type ProductReviewFormFieldsProps = Omit<ProductReviewFormProps, "resetKey">

const ProductReviewFormFields = ({
  disabled = false,
  formId,
  submitError,
  onSubmit,
}: ProductReviewFormFieldsProps) => {
  const tCatalog = useTranslations("catalog")
  const [errors, setErrors] = useState<ProductReviewFormErrors>({})
  const [values, setValues] = useState<ProductReviewFormValues>(
    DEFAULT_PRODUCT_REVIEW_FORM_VALUES,
  )

  const handleSubmit = (
    event: SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault()

    const nextErrors = validateProductReviewForm(values, {
      contentMinLength: tCatalog("reviews.form.content_min_length_validation", {
        min: REVIEW_CONTENT_MIN_LENGTH,
      }),
      ratingRequired: tCatalog("reviews.form.rating_validation"),
    })
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    const content = values.content.trim()
    const { rating } = values

    if (typeof rating !== "number") {
      return
    }

    onSubmit({
      content,
      rating,
      title: buildProductReviewTitle(content),
    })
  }

  return (
    <form
      className="space-y-300"
      id={formId}
      noValidate
      onSubmit={handleSubmit}
    >
      {submitError === null || submitError === undefined ? null : (
        <StatusText showIcon status="error">
          {submitError}
        </StatusText>
      )}

      <div className="flex flex-col gap-form-field-gap">
        <Rating
          allowHalf={false}
          disabled={disabled}
          id={`${formId}-rating`}
          labelText={tCatalog("reviews.form.rating_label")}
          name="rating"
          onChange={(rating: number) => {
            setValues((current) => ({
              ...current,
              rating: rating > 0 ? rating : null,
            }))
            setErrors(({ rating: _rating, ...current }) => current)
          }}
          size="lg"
          value={values.rating ?? undefined}
        />
        {errors.rating !== undefined && errors.rating !== "" ? (
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
        onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
          setValues((current) => ({
            ...current,
            content: event.target.value,
          }))
          setErrors(({ content: _content, ...current }) => current)
        }}
        required
        resize="y"
        rows={5}
        validateStatus={
          errors.content !== undefined && errors.content !== ""
            ? "error"
            : "default"
        }
        value={values.content}
      />
    </form>
  )
}

export const ProductReviewForm = ({
  resetKey = 0,
  ...props
}: ProductReviewFormProps) => (
  <ProductReviewFormFields key={resetKey} {...props} />
)
