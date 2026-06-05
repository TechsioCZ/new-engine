"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { StatusText } from "@techsio/ui-kit/atoms/status-text";
import { FormInput } from "@techsio/ui-kit/molecules/form-input";
import { useEffect, useRef, useState } from "react";
import {
  StorefrontAccountSkeletonSurface,
  StorefrontAccountSurface,
} from "@/components/account/storefront-account-surface";
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form";
import {
  accountSettingsValidators,
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

  const form = useHerbatikaForm({
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
            <StatusText showIcon status="error">
              {submitError}
            </StatusText>
          </div>
        )}

        {submitSuccess && (
          <div className="md:col-span-2">
            <StatusText showIcon status="success">
              {submitSuccess}
            </StatusText>
          </div>
        )}

        <form.AppField
          name="first_name"
          validators={accountSettingsValidators.first_name}
        >
          {(field) => (
            <field.TextField
              id="account-settings-first-name"
              label="Meno"
              onValueChange={() => {
                setSubmitError(null);
                setSubmitSuccess(null);
              }}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>

        <form.AppField
          name="last_name"
          validators={accountSettingsValidators.last_name}
        >
          {(field) => (
            <field.TextField
              id="account-settings-last-name"
              label="Priezvisko"
              onValueChange={() => {
                setSubmitError(null);
                setSubmitSuccess(null);
              }}
              required
              validationMode="blur"
            />
          )}
        </form.AppField>

        <div className="md:col-span-2">
          <FormInput
            disabled
            id="account-settings-email"
            label="E-mail (nemožno upraviť)"
            value={authQuery.customer.email ?? ""}
          />
        </div>

        <form.AppField name="phone" validators={accountSettingsValidators.phone}>
          {(field) => (
            <field.TextField
              id="account-settings-phone"
              label="Telefón"
              onValueChange={() => {
                setSubmitError(null);
                setSubmitSuccess(null);
              }}
              type="tel"
              validationMode="blur"
            />
          )}
        </form.AppField>

        <form.AppField name="company_name">
          {(field) => (
            <field.TextField
              id="account-settings-company"
              label="Firma (voliteľné)"
              onValueChange={() => {
                setSubmitError(null);
                setSubmitSuccess(null);
              }}
              validationMode="none"
            />
          )}
        </form.AppField>

        <div className="md:col-span-2 flex justify-end">
          <Button isLoading={updateCustomerMutation.isPending} type="submit">
            Uložiť údaje
          </Button>
        </div>
      </form>
    </StorefrontAccountSurface>
  );
}
