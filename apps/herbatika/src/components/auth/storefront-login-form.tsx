"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { useState } from "react";
import { AuthTextField } from "@/components/auth/auth-text-field";

type LoginFormValues = {
  email: string;
  password: string;
};

type StorefrontLoginFormProps = {
  isBusy: boolean;
  defaultValues: LoginFormValues;
  registerHref: string;
  onSubmit: (values: LoginFormValues) => Promise<string | null>;
};

export const StorefrontLoginForm = ({
  isBusy,
  defaultValues,
  registerHref,
  onSubmit,
}: StorefrontLoginFormProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      const error = await onSubmit(value);
      setSubmitError(error);
    },
  });

  const values = useStore(form.store, (state) => state.values);
  const isSubmitDisabled = isBusy || !values.email.trim() || !values.password;

  return (
    <form
      className="flex flex-col gap-300"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Field name="email">
        {(field) => (
          <AuthTextField
            autoComplete="email"
            field={field}
            id="auth-login-email"
            label="E-mail"
            onExternalErrorClear={() => setSubmitError(null)}
            required
            type="email"
            validationMode="none"
          />
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <AuthTextField
            autoComplete="current-password"
            externalError={submitError}
            field={field}
            id="auth-login-password"
            label="Heslo"
            onExternalErrorClear={() => setSubmitError(null)}
            required
            type="password"
            validationMode="none"
          />
        )}
      </form.Field>

      <div className="md:col-span-2 flex flex-wrap gap-200">
        <Button disabled={isSubmitDisabled} isLoading={isBusy} type="submit">
          Prihlásiť
        </Button>
        <LinkButton as={NextLink} href={registerHref} variant="primary" className="items-center rounded-sm px-200 text-sm">
          Na registráciu
        </LinkButton>
      </div>
    </form>
  );
};
