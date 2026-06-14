"use client";

import { Rating } from "@techsio/ui-kit/atoms/rating";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea";
import { type FormEvent, useEffect, useState } from "react";
import { buildProductReviewTitle } from "@/components/reviews/product-review-errors";

export type ProductReviewFormSubmitValues = {
  content: string;
  rating: number;
  title: string;
};

type ProductReviewFormValues = {
  content: string;
  rating: number | null;
};

type ProductReviewFormErrors = Partial<Record<keyof ProductReviewFormValues, string>>;

type ProductReviewFormProps = {
  disabled?: boolean;
  formId: string;
  resetKey?: number;
  submitError?: string | null;
  onSubmit: (values: ProductReviewFormSubmitValues) => void;
};

const REVIEW_CONTENT_MIN_LENGTH = 4;
const defaultValues: ProductReviewFormValues = {
  content: "",
  rating: null,
};

const validateReviewForm = (values: ProductReviewFormValues) => {
  const errors: ProductReviewFormErrors = {};

  if (
    typeof values.rating !== "number" ||
    !Number.isInteger(values.rating) ||
    values.rating < 1 ||
    values.rating > 5
  ) {
    errors.rating = "Vyberte hodnotenie od 1 do 5 hviezdičiek.";
  }

  if (values.content.trim().length < REVIEW_CONTENT_MIN_LENGTH) {
    errors.content = `Napíšte aspoň ${REVIEW_CONTENT_MIN_LENGTH} znakov.`;
  }

  return errors;
};

export function ProductReviewForm({
  disabled = false,
  formId,
  resetKey,
  submitError,
  onSubmit,
}: ProductReviewFormProps) {
  const [errors, setErrors] = useState<ProductReviewFormErrors>({});
  const [values, setValues] = useState<ProductReviewFormValues>(defaultValues);

  useEffect(() => {
    setErrors({});
    setValues(defaultValues);
  }, [resetKey]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validateReviewForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const content = values.content.trim();
    const rating = values.rating;

    if (typeof rating !== "number") {
      return;
    }

    onSubmit({
      content,
      rating,
      title: buildProductReviewTitle(content),
    });
  };

  return (
    <form className="space-y-300" id={formId} noValidate onSubmit={handleSubmit}>
      {submitError ? (
        <StatusText showIcon status="error">
          {submitError}
        </StatusText>
      ) : null}

      <div className="flex flex-col gap-form-field-gap">
        <Rating
          allowHalf={false}
          disabled={disabled}
          id={`${formId}-rating`}
          labelText="Hodnotenie"
          name="rating"
          onChange={(rating) => {
            setValues((current) => ({
              ...current,
              rating: rating > 0 ? rating : null,
            }));
            setErrors((current) => ({ ...current, rating: undefined }));
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
          errors.content ?? `Minimálne ${REVIEW_CONTENT_MIN_LENGTH} znakov.`
        }
        id={`${formId}-content`}
        label="Recenzia"
        maxLength={1000}
        onChange={(event) => {
          setValues((current) => ({
            ...current,
            content: event.target.value,
          }));
          setErrors((current) => ({ ...current, content: undefined }));
        }}
        required
        resize="y"
        rows={5}
        validateStatus={errors.content ? "error" : "default"}
        value={values.content}
      />
    </form>
  );
}
