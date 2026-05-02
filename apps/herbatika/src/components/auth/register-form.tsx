"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { useState } from "react";
import { PasswordRequirements } from "@/components/auth/password-requirements";
import {
  registerValidators,
  type RegisterFormValues,
} from "@/lib/auth/auth-form-validators";
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form";
import { AuthFooter } from "./auth-footer";

type RegisterFormProps = {
  isBusy: boolean;
  defaultValues: RegisterFormValues;
  loginHref: string;
  isDiagnosticsMode: boolean;
  onGenerateIdentity: () => RegisterFormValues;
  onSubmit: (values: RegisterFormValues) => Promise<string | null>;
};

export const RegisterForm = ({
  isBusy,
  defaultValues,
  loginHref,
  isDiagnosticsMode,
  onGenerateIdentity,
  onSubmit,
}: RegisterFormProps) => {
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
      className="grid gap-300 md:grid-cols-2"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      {submitError && (
        <div className="md:col-span-2">
          <StatusText showIcon status="error">
            {submitError}
          </StatusText>
        </div>
      )}

      <form.AppField name="first_name" validators={registerValidators.first_name}>
        {(field) => (
          <field.TextField
            autoComplete="given-name"
            id="auth-register-first-name"
            label="Meno"
            onValueChange={() => setSubmitError(null)}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <form.AppField name="last_name" validators={registerValidators.last_name}>
        {(field) => (
          <field.TextField
            autoComplete="family-name"
            id="auth-register-last-name"
            label="Priezvisko"
            onValueChange={() => setSubmitError(null)}
            required
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="md:col-span-2">
        <form.AppField name="email" validators={registerValidators.email}>
          {(field) => (
            <field.TextField
              autoComplete="email"
              id="auth-register-email"
              label="E-mailová adresa"
              onValueChange={() => setSubmitError(null)}
              required
              type="email"
              validationMode="blur"
            />
          )}
        </form.AppField>
      </div>

      <form.AppField name="password" validators={registerValidators.password}>
        {(field) => (
          <div className="space-y-200">
            <field.TextField
              autoComplete="new-password"
              id="auth-register-password"
              label="Heslo"
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
        validators={registerValidators.confirm_password}
      >
        {(field) => (
          <field.TextField
            autoComplete="new-password"
            id="auth-register-confirm-password"
            label="Potvrdenie hesla"
            onValueChange={() => setSubmitError(null)}
            required
            type="password"
            validationMode="blur"
          />
        )}
      </form.AppField>

      <div className="md:col-span-2">
        <form.AppField
          name="accept_terms"
          validators={registerValidators.accept_terms}
        >
          {(field) => (
            <field.CheckboxField
              id="auth-register-accept-terms"
              label="Súhlasím s obchodnými podmienkami"
              onValueChange={() => setSubmitError(null)}
              required
              size="sm"
            />
          )}
        </form.AppField>
      </div>

      <div className="md:col-span-2 flex flex-wrap gap-200">
        <Button isLoading={isBusy} type="submit" size="sm" block>
          Registrovať sa
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
            size="sm"
          >
            Vygenerovať test identitu
          </Button>
        ) : null}
      </div>
      <div className="col-span-2">
        <AuthFooter text="Už máte účet?" href={loginHref} linkText="Prihlásiť sa"/>
      </div>
    </form>
  );
};
