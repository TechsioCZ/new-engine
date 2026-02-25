"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { Button } from "@techsio/ui-kit/atoms/button";
import { ErrorText } from "@techsio/ui-kit/atoms/error-text";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { useEffect, useRef, useState } from "react";
import { AuthTextField } from "@/components/auth/auth-text-field";
import {
  StorefrontAccountSkeletonSurface,
  StorefrontAccountSurface,
} from "@/components/account/storefront-account-surface";
import {
  accountSettingsValidators,
  isAccountSettingsFormValid,
  toAccountSettingsValues,
} from "@/lib/storefront/account-settings-validators";
import { useAuth } from "@/lib/storefront/auth";
import { useUpdateCustomer } from "@/lib/storefront/customers";
import { resolveErrorMessage } from "@/lib/storefront/error-utils";

export function StorefrontAccountSettings() {
  const authQuery = useAuth();
  const updateCustomerMutation = useUpdateCustomer();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const hydratedCustomerIdRef = useRef<string | null>(null);

  const form = useForm({
    defaultValues: toAccountSettingsValues(authQuery.customer),
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      setSubmitSuccess(null);

      try {
        const payload = {
          first_name: value.first_name.trim(),
          last_name: value.last_name.trim(),
          phone: value.phone.trim() || undefined,
          company_name: value.company_name.trim() || undefined,
        };

        await updateCustomerMutation.mutateAsync(payload);

        form.setFieldValue("first_name", payload.first_name);
        form.setFieldValue("last_name", payload.last_name);
        form.setFieldValue("phone", payload.phone ?? "");
        form.setFieldValue("company_name", payload.company_name ?? "");

        setSubmitSuccess("Údaje účtu boli uložené.");
      } catch (error) {
        setSubmitError(resolveErrorMessage(error));
      }
    },
  });

  const values = useStore(form.store, (state) => state.values);
  const isSubmitDisabled =
    updateCustomerMutation.isPending || !isAccountSettingsFormValid(values);

  useEffect(() => {
    const customer = authQuery.customer;

    if (!customer) {
      hydratedCustomerIdRef.current = null;
      return;
    }

    if (hydratedCustomerIdRef.current === customer.id) {
      return;
    }

    const defaults = toAccountSettingsValues(customer);
    form.setFieldValue("first_name", defaults.first_name);
    form.setFieldValue("last_name", defaults.last_name);
    form.setFieldValue("phone", defaults.phone);
    form.setFieldValue("company_name", defaults.company_name);
    hydratedCustomerIdRef.current = customer.id;
    setSubmitError(null);
    setSubmitSuccess(null);
  }, [authQuery.customer, form]);

  if (authQuery.isLoading) {
    return <StorefrontAccountSkeletonSurface lines={6} />;
  }

  if (!authQuery.customer) {
    return (
      <StorefrontAccountSurface className="space-y-300">
        <h2 className="text-lg font-semibold">Nastavenia účtu</h2>
        <p className="text-fg-secondary text-sm">
          Údaje účtu nie sú dostupné. Skúste stránku obnoviť.
        </p>
      </StorefrontAccountSurface>
    );
  }

  return (
    <StorefrontAccountSurface className="space-y-500">
      <header className="space-y-200">
        <h2 className="text-xl font-semibold">Nastavenia účtu</h2>
        <p className="text-fg-secondary text-sm">
          Aktualizujte osobné údaje pre rýchlejší checkout.
        </p>
      </header>

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

        {submitSuccess && (
          <div className="md:col-span-2">
            <StatusText showIcon status="success">
              {submitSuccess}
            </StatusText>
          </div>
        )}

        <form.Field name="first_name" validators={accountSettingsValidators.first_name}>
          {(field) => (
            <AuthTextField
              field={field}
              id="account-settings-first-name"
              label="Meno"
              required
              validationMode="blur"
            />
          )}
        </form.Field>

        <form.Field name="last_name" validators={accountSettingsValidators.last_name}>
          {(field) => (
            <AuthTextField
              field={field}
              id="account-settings-last-name"
              label="Priezvisko"
              required
              validationMode="blur"
            />
          )}
        </form.Field>

        <div className="md:col-span-2">
          <FormInput
            disabled
            id="account-settings-email"
            label="E-mail (nemožno upraviť)"
            value={authQuery.customer.email ?? ""}
          />
        </div>

        <form.Field name="phone" validators={accountSettingsValidators.phone}>
          {(field) => (
            <AuthTextField
              field={field}
              id="account-settings-phone"
              label="Telefón"
              validationMode="blur"
            />
          )}
        </form.Field>

        <form.Field name="company_name">
          {(field) => (
            <AuthTextField
              field={field}
              id="account-settings-company"
              label="Firma (voliteľné)"
              validationMode="none"
            />
          )}
        </form.Field>

        <div className="md:col-span-2 flex justify-end">
          <Button disabled={isSubmitDisabled} isLoading={updateCustomerMutation.isPending} type="submit">
            Uložiť údaje
          </Button>
        </div>
      </form>
    </StorefrontAccountSurface>
  );
}
