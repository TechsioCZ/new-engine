"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Rating } from "@techsio/ui-kit/atoms/rating";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { Dialog } from "@techsio/ui-kit/molecules/dialog";
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useState } from "react";
import { buildAuthRouteHref } from "@/components/auth/auth-helpers";
import { PRODUCT_DETAIL_REVIEWS_SECTION_ID } from "@/components/product-detail/sections/product-detail-review-utils";
import { useAuth } from "@/lib/storefront/auth";
import { useCreateProductReview } from "@/lib/storefront/reviews";

type ProductReviewCreateDialogProps = {
  productId: string;
  triggerLabel?: string;
};

type ReviewFormValues = {
  content: string;
  rating: number;
};

type ReviewFormErrors = Partial<Record<keyof ReviewFormValues, string>>;

const REVIEW_FORM_ID = "product-detail-create-review-form";
const REVIEW_CONTENT_MIN_LENGTH = 4;
const REVIEW_TITLE_MAX_LENGTH = 200;
const GENERIC_REVIEW_SUBMIT_ERROR =
  "Recenziu sa nepodarilo odoslať. Skúste to prosím znova.";
const defaultValues: ReviewFormValues = {
  content: "",
  rating: 0,
};

const hasErrorShape = (
  error: unknown,
): error is { message?: unknown; status?: unknown; statusText?: unknown } =>
  Boolean(error && typeof error === "object");

const resolveReviewSubmitErrorMessage = (error: unknown) => {
  const message =
    typeof error === "string"
      ? error
      : hasErrorShape(error) && typeof error.message === "string"
        ? error.message
        : "";
  const status =
    hasErrorShape(error) && typeof error.status === "number"
      ? error.status
      : undefined;
  const normalizedMessage = message.toLowerCase();

  if (!message && status === undefined) {
    return GENERIC_REVIEW_SUBMIT_ERROR;
  }

  if (
    status === 409 ||
    normalizedMessage.includes("already") ||
    normalizedMessage.includes("duplicate") ||
    normalizedMessage.includes("exist") ||
    normalizedMessage.includes("reviewed")
  ) {
    return "Tento produkt ste už hodnotili.";
  }

  if (status === 401) {
    return "Pre odoslanie recenzie sa prosím prihláste.";
  }

  if (status === 403) {
    return "Recenziu pre tento produkt momentálne nemôžete odoslať.";
  }

  if (status === 400 || status === 422) {
    return message || "Skontrolujte prosím hodnotenie a text recenzie.";
  }

  if (status && status >= 500) {
    return GENERIC_REVIEW_SUBMIT_ERROR;
  }

  return message || GENERIC_REVIEW_SUBMIT_ERROR;
};

const validateReviewForm = (values: ReviewFormValues) => {
  const errors: ReviewFormErrors = {};

  if (
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

export function ProductReviewCreateDialog({
  productId,
  triggerLabel = "Napísať recenziu",
}: ProductReviewCreateDialogProps) {
  const authQuery = useAuth();
  const pathname = usePathname();
  const [errors, setErrors] = useState<ReviewFormErrors>({});
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [values, setValues] = useState<ReviewFormValues>(defaultValues);
  const loginHref = buildAuthRouteHref(
    "/auth/login",
    `${pathname}#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`,
  );
  const createReviewMutation = useCreateProductReview({
    onError: (error) => {
      setSubmitError(resolveReviewSubmitErrorMessage(error));
    },
    onSuccess: () => {
      setErrors({});
      setIsSubmitted(true);
      setSubmitError(null);
      setValues(defaultValues);
    },
  });
  const isBusy = createReviewMutation.isPending;
  const isAuthenticated = authQuery.isAuthenticated;

  const handleOpenChange = ({ open }: { open: boolean }) => {
    setIsOpen(open);

    if (!open) {
      setErrors({});
      setIsSubmitted(false);
      setSubmitError(null);
      setValues(defaultValues);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = validateReviewForm(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const content = values.content.trim();

    createReviewMutation.mutate({
      content,
      product_id: productId,
      rating: values.rating,
      title: content.slice(0, REVIEW_TITLE_MAX_LENGTH),
    });
  };

  const renderContent = () => {
    if (authQuery.isLoading) {
      return (
        <StatusText showIcon status="default">
          Overujem prihlásenie.
        </StatusText>
      );
    }

    if (!isAuthenticated) {
      return (
        <StatusText showIcon status="warning">
          Na napísanie recenzie sa prosím prihláste.
        </StatusText>
      );
    }

    if (isSubmitted) {
      return (
        <StatusText showIcon status="success">
          Ďakujeme za recenziu. Po schválení sa zobrazí pri produkte.
        </StatusText>
      );
    }

    return (
      <form
        className="space-y-300"
        id={REVIEW_FORM_ID}
        noValidate
        onSubmit={handleSubmit}
      >
        {submitError ? (
          <StatusText showIcon status="error">
            {submitError}
          </StatusText>
        ) : null}

        <div className="flex flex-col gap-form-field-gap">
          <Rating
            allowHalf={false}
            disabled={isBusy}
            id={`${REVIEW_FORM_ID}-rating`}
            labelText="Hodnotenie"
            name="rating"
            onChange={(rating) => {
              setValues((current) => ({ ...current, rating }));
              setErrors((current) => ({ ...current, rating: undefined }));
            }}
            size="lg"
            value={values.rating}
          />
          {errors.rating ? (
            <StatusText showIcon status="error">
              {errors.rating}
            </StatusText>
          ) : null}
        </div>

        <FormTextarea
          disabled={isBusy}
          helpText={
            errors.content ?? `Minimálne ${REVIEW_CONTENT_MIN_LENGTH} znakov.`
          }
          id={`${REVIEW_FORM_ID}-content`}
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
  };

  const renderActions = () => {
    if (!isAuthenticated && !authQuery.isLoading) {
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
      );
    }

    if (isSubmitted) {
      return (
        <Button onClick={() => setIsOpen(false)} size="sm" variant="primary">
          Zavrieť
        </Button>
      );
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
    );
  };

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
  );
}
