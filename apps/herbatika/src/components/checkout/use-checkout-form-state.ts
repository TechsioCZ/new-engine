"use client";

import type { HttpTypes } from "@medusajs/types";
import { useEffect, useState } from "react";
import { DEFAULT_ADDRESS_FORM, type AddressFormState } from "./checkout.constants";

type UseCheckoutFormStateProps = {
  cart: HttpTypes.StoreCart | null | undefined;
  customer: HttpTypes.StoreCustomer | null | undefined;
  isCartLoading: boolean;
  regionCountryCode?: string;
};

export function useCheckoutFormState({
  cart,
  customer,
  isCartLoading,
  regionCountryCode,
}: UseCheckoutFormStateProps) {
  const [addressForm, setAddressForm] = useState<AddressFormState>(
    DEFAULT_ADDRESS_FORM,
  );
  const [isAddressInitialized, setIsAddressInitialized] = useState(false);
  const [createAccountConsent, setCreateAccountConsent] = useState(false);
  const [acceptTermsConsent, setAcceptTermsConsent] = useState(false);

  useEffect(() => {
    if (isAddressInitialized || isCartLoading) {
      return;
    }

    const billingAddress = cart?.billing_address;
    const shippingAddress = cart?.shipping_address;
    const baseAddress = billingAddress ?? shippingAddress;

    setAddressForm((previous) => ({
      ...previous,
      email: cart?.email ?? customer?.email ?? previous.email,
      firstName: baseAddress?.first_name ?? customer?.first_name ?? previous.firstName,
      lastName: baseAddress?.last_name ?? customer?.last_name ?? previous.lastName,
      phone: baseAddress?.phone ?? previous.phone,
      company: baseAddress?.company ?? previous.company,
      address1: baseAddress?.address_1 ?? previous.address1,
      address2: baseAddress?.address_2 ?? previous.address2,
      city: baseAddress?.city ?? previous.city,
      postalCode: baseAddress?.postal_code ?? previous.postalCode,
      countryCode: (
        baseAddress?.country_code ??
        regionCountryCode ??
        previous.countryCode
      ).toUpperCase(),
    }));
    setIsAddressInitialized(true);
  }, [
    cart,
    customer?.email,
    customer?.first_name,
    customer?.last_name,
    isAddressInitialized,
    isCartLoading,
    regionCountryCode,
  ]);

  const updateAddressField = <K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => {
    setAddressForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  return {
    acceptTermsConsent,
    addressForm,
    createAccountConsent,
    setAcceptTermsConsent,
    setCreateAccountConsent,
    updateAddressField,
  };
}
