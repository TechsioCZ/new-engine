"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import NextLink from "next/link";
import { useState } from "react";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import {
  resetPasswordValidators,
  type ResetPasswordFormValues,
} from "@/lib/auth/auth-form-validators";
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form";

type ResetPasswordFormProps = {
  isBusy: boolean;
  defaultValues: ResetPasswordFormValues;
  loginHref: string;
  hasToken: boolean;
  onSubmit: (values: ResetPasswordFormValues) => Promise<string | null>;
};

export const ResetPasswordForm = ({
  isBusy,
  defaultValues,
  loginHref,
  hasToken,
  onSubmit,
}: ResetPasswordFormProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useHerbatikaForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const error = await onSubmit(value);
      if (error) {
        setSubmitError(error);
        return;
      }
      setIsSuccess(true);
    },
  });

  if (!hasToken) {
    return (
      <div className="flex flex-col gap-300">
        <StatusText showIcon status="error">
          Tento odkaz je neplatný alebo už vypršal.
        </StatusText>
        <p className="text-sm text-fg-secondary">
          Skúste si vyžiadať nový odkaz na obnovu hesla.
        </p>
        <div className="flex flex-wrap gap-200">
          <LinkButton
            as={NextLink}
            href="/auth/forgot-password"
            variant="primary"
            size="sm"
          >
            Vyžiadať nový odkaz
          </LinkButton>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-300">
        <StatusText showIcon status="success">
          Heslo bolo úspešne zmenené. Môžete sa prihlásiť pomocou nového hesla.
        </StatusText>
        <div className="flex flex-wrap gap-200">
          <LinkButton as={NextLink} href={loginHref} variant="primary" size="sm">
            Prejsť na prihlásenie
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-300"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {submitError && (
        <StatusText showIcon status="error">
          {submitError}
        </StatusText>
      )}

      <form.AppField
        name="password"
        validators={resetPasswordValidators.password}
      >
        {(field) => (
          <div className="space-y-200">
            <field.TextField
              autoComplete="new-password"
              id="auth-reset-password"
              label="Nové heslo"
              onValueChange={() => setSubmitError(null)}
              required
              type="password"
              validationMode="blur"
            />
            <PasswordRequirements password={String(field.state.value ?? "")} />
          </div>
        )}
      </form.AppField>

      <form.AppField
        name="confirm_password"
        validators={resetPasswordValidators.confirm_password}
      >
        {(field) => (
          <field.TextField
            autoComplete="new-password"
            id="auth-reset-confirm-password"
            label="Potvrdenie hesla"
            onValueChange={() => setSubmitError(null)}
            required
            type="password"
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="flex flex-wrap gap-200">
        <Button isLoading={isBusy} type="submit" size="sm">
          Obnoviť heslo
        </Button>
      </div>
    </form>
  );
};
