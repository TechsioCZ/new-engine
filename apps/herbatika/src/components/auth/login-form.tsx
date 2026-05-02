"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox";
import { Label } from "@techsio/ui-kit/atoms/label";
import NextLink from "next/link";
import { useState } from "react";
import {
  loginValidators,
  type LoginFormValues,
} from "@/lib/auth/auth-form-validators";
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form";
import { AuthFooter } from "./auth-footer";

type LoginFormProps = {
  isBusy: boolean;
  defaultValues: LoginFormValues;
  registerHref: string;
  forgotPasswordHref: string;
  onSubmit: (values: LoginFormValues) => Promise<string | null>;
};

const REMEMBER_FIELD_ID = "login-remember";

export const LoginForm = ({
  isBusy,
  defaultValues,
  registerHref,
  forgotPasswordHref,
  onSubmit,
}: LoginFormProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const form = useHerbatikaForm({
    defaultValues,
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      const error = await onSubmit(value);
      setSubmitError(error);
    },
  });

  return (
    <div>
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
              id="login-email"
              label="E-mail"
              onValueChange={() => setSubmitError(null)}
              type="email"
              validationMode="blur"
            />
          )}
        </form.AppField>

        <div className="flex flex-col gap-form-field-gap">
          <div className="flex items-center justify-between gap-200">
            <Label htmlFor="login-password">Heslo</Label>
            <NextLink
              className="font-normal text-sm text-fg-secondary underline-offset-4 transition-colors hover:text-primary hover:underline"
              href={forgotPasswordHref}
              onMouseDown={(e) => e.preventDefault()}
            >
              Zabudnuté heslo?
            </NextLink>
          </div>
        <form.AppField name="password" validators={loginValidators.password}>
          {(field) => (
            <field.TextField
              autoComplete="current-password"
              externalError={submitError}
              id="login-password"
              label={<span className="sr-only">Heslo</span>}
              onValueChange={() => setSubmitError(null)}
              type="password"
              validationMode="blur"
            />
          )}
        </form.AppField>
        </div>

        <div className="flex items-center gap-200">
          <Checkbox
            checked={rememberMe}
            id={REMEMBER_FIELD_ID}
            onChange={(event) => setRememberMe(event.target.checked)}
          />
          <Label htmlFor={REMEMBER_FIELD_ID} size="sm">
            Zapamätať si ma
          </Label>
        </div>

        <Button block isLoading={isBusy} size="md" type="submit">
          Prihlásiť sa
        </Button>
      </form>
      <AuthFooter text="Nemáte ešte účet?" href={registerHref} linkText="Zaregistrujte sa"/>
    </div>
  );
};
