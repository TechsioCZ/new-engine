"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import NextLink from "next/link";
import { useState } from "react";
import {
  loginValidators,
  type LoginFormValues,
} from "@/lib/auth/auth-form-validators";
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form";

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

  const form = useHerbatikaForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const error = await onSubmit(value);
      setSubmitError(error);
    },
  });

  return (
    <form
      className="flex flex-col gap-300"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="email" validators={loginValidators.email}>
        {(field) => (
          <field.TextField
            autoComplete="email"
            id="auth-login-email"
            label="E-mail"
            onValueChange={() => setSubmitError(null)}
            required
            type="email"
            validationMode="blur"
          />
        )}
      </form.AppField>

      <form.AppField name="password" validators={loginValidators.password}>
        {(field) => (
          <field.TextField
            autoComplete="current-password"
            externalError={submitError}
            id="auth-login-password"
            label="Heslo"
            onValueChange={() => setSubmitError(null)}
            required
            type="password"
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="md:col-span-2 flex flex-wrap gap-200">
        <Button isLoading={isBusy} type="submit" size="sm">
          Prihlásiť
        </Button>
        <LinkButton as={NextLink} href={registerHref} variant="primary" size="sm">
          Na registráciu
        </LinkButton>
      </div>
    </form>
  );
};
