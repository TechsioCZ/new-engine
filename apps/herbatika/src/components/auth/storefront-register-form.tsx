"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { useState } from "react";
import { AuthTextField } from "@/components/auth/auth-text-field";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import { StorefrontRegisterTermsField } from "@/components/auth/storefront-register-terms-field";
import {
  isRegisterFormValid,
  registerValidators,
  type RegisterFormValues,
} from "@/lib/auth/auth-form-validators";

type StorefrontRegisterFormProps = {
  isBusy: boolean;
  defaultValues: RegisterFormValues;
  loginHref: string;
  isDiagnosticsMode: boolean;
  onGenerateIdentity: () => RegisterFormValues;
  onSubmit: (values: RegisterFormValues) => Promise<string | null>;
};

export const StorefrontRegisterForm = ({
  isBusy,
  defaultValues,
  loginHref,
  isDiagnosticsMode,
  onGenerateIdentity,
  onSubmit,
}: StorefrontRegisterFormProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      if (!isRegisterFormValid(value)) {
        return;
      }

      const error = await onSubmit(value);
      setSubmitError(error);
    },
  });

  const values = useStore(form.store, (state) => state.values);
  const isSubmitDisabled = isBusy || !isRegisterFormValid(values);

  return (
    <form
      className="grid gap-300 md:grid-cols-2"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {submitError && (
        <div className="md:col-span-2">
          <ErrorText showIcon>{submitError}</ErrorText>
        </div>
      )}

      <form.Field name="first_name" validators={registerValidators.first_name}>
        {(field) => (
          <AuthTextField
            autoComplete="given-name"
            field={field}
            id="auth-register-first-name"
            label="Meno"
            required
            validationMode="blur"
          />
        )}
      </form.Field>

      <form.Field name="last_name" validators={registerValidators.last_name}>
        {(field) => (
          <AuthTextField
            autoComplete="family-name"
            field={field}
            id="auth-register-last-name"
            label="Priezvisko"
            required
            validationMode="blur"
          />
        )}
      </form.Field>

      <div className="md:col-span-2">
        <form.Field name="email" validators={registerValidators.email}>
          {(field) => (
            <AuthTextField
              autoComplete="email"
              field={field}
              id="auth-register-email"
              label="E-mailová adresa"
              required
              type="email"
              validationMode="blur"
            />
          )}
        </form.Field>
      </div>

      <form.Field name="password" validators={registerValidators.password}>
        {(field) => (
          <div className="space-y-200">
            <AuthTextField
              autoComplete="new-password"
              field={field}
              id="auth-register-password"
              label="Heslo"
              required
              type="password"
              validationMode="blur"
            />
            <PasswordRequirements password={String(field.state.value ?? "")} />
          </div>
        )}
      </form.Field>

      <form.Field
        name="confirm_password"
        validators={registerValidators.confirm_password}
      >
        {(field) => (
          <AuthTextField
            autoComplete="new-password"
            field={field}
            id="auth-register-confirm-password"
            label="Potvrdenie hesla"
            required
            type="password"
            validationMode="blur"
          />
        )}
      </form.Field>

      <div className="md:col-span-2">
        <form.Field name="accept_terms" validators={registerValidators.accept_terms}>
          {(field) => (
            <StorefrontRegisterTermsField
              field={field}
              onChange={() => setSubmitError(null)}
            />
          )}
        </form.Field>
      </div>

      <div className="md:col-span-2 flex flex-wrap gap-200">
        <Button disabled={isSubmitDisabled} isLoading={isBusy} type="submit">
          Registrovať
        </Button>

        {isDiagnosticsMode ? (
          <Button
            disabled={isBusy}
            onClick={() => {
              const identity = onGenerateIdentity();

              form.setFieldValue("email", identity.email);
              form.setFieldValue("first_name", identity.first_name);
              form.setFieldValue("last_name", identity.last_name);
              form.setFieldValue("password", identity.password);
              form.setFieldValue("confirm_password", identity.confirm_password);
              form.setFieldValue("accept_terms", identity.accept_terms);
              setSubmitError(null);
            }}
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Vygenerovať test identitu
          </Button>
        ) : null}

        <LinkButton as={NextLink} href={loginHref} theme="outlined" variant="secondary">
          Na prihlásenie
        </LinkButton>
      </div>
    </form>
  );
};
