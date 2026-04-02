"use client";

import type { HttpTypes } from "@medusajs/types";
import { useEffect, useMemo, useState } from "react";
import { mapHerbatikaAddressFormStateFromMedusaAddress } from "@/lib/storefront/cart/address-adapter";
import {
  type AddressFormState,
  DEFAULT_ADDRESS_FORM,
} from "./checkout.constants";

type UseCheckoutFormStateProps = {
  cart: HttpTypes.StoreCart | null | undefined;
  customer: HttpTypes.StoreCustomer | null | undefined;
  isCartLoading: boolean;
  isCustomerLoading: boolean;
  regionCountryCode?: string;
};

export function useCheckoutFormState({
  cart,
  customer,
  isCartLoading,
  isCustomerLoading,
  regionCountryCode,
}: UseCheckoutFormStateProps) {
  const [addressForm, setAddressForm] =
    useState<AddressFormState>(DEFAULT_ADDRESS_FORM);
  const [hasAddressInteraction, setHasAddressInteraction] = useState(false);
  const [isCompanyPurchase, setIsCompanyPurchase] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [heurekaConsent, setHeurekaConsent] = useState(false);

  const baseAddress = cart?.billing_address ?? cart?.shipping_address;
  const resolvedAddressValues = useMemo(
    () => mapHerbatikaAddressFormStateFromMedusaAddress(baseAddress),
    [baseAddress],
  );
  const canPrefillAddress = !isCartLoading && !isCustomerLoading;

  useEffect(() => {
    if (!canPrefillAddress || hasAddressInteraction) {
      return;
    }

    setAddressForm((previous) => ({
      ...previous,
      email: cart?.email ?? customer?.email ?? previous.email,
      firstName:
        resolvedAddressValues.firstName ??
        customer?.first_name ??
        previous.firstName,
      lastName:
        resolvedAddressValues.lastName ??
        customer?.last_name ??
        previous.lastName,
      phone: resolvedAddressValues.phone ?? previous.phone,
      company: resolvedAddressValues.company ?? previous.company,
      companyId: resolvedAddressValues.companyId ?? previous.companyId,
      taxId: resolvedAddressValues.taxId ?? previous.taxId,
      vatId: resolvedAddressValues.vatId ?? previous.vatId,
      address1: resolvedAddressValues.address1 ?? previous.address1,
      address2: resolvedAddressValues.address2 ?? previous.address2,
      city: resolvedAddressValues.city ?? previous.city,
      postalCode: resolvedAddressValues.postalCode ?? previous.postalCode,
      countryCode:
        resolvedAddressValues.countryCode ??
        regionCountryCode?.toUpperCase() ??
        previous.countryCode,
      customerNote: resolvedAddressValues.customerNote ?? previous.customerNote,
    }));
    setIsCompanyPurchase(Boolean(baseAddress?.company));
  }, [
    baseAddress?.company,
    canPrefillAddress,
    customer?.email,
    customer?.first_name,
    customer?.last_name,
    hasAddressInteraction,
    cart?.email,
    regionCountryCode,
    resolvedAddressValues,
  ]);

  const updateAddressField = <K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => {
    setHasAddressInteraction(true);
    setAddressForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSetIsCompanyPurchase = (value: boolean) => {
    setHasAddressInteraction(true);
    setIsCompanyPurchase(value);
  };

  return {
    addressForm,
    heurekaConsent,
    isCompanyPurchase,
    marketingConsent,
    setHeurekaConsent,
    setIsCompanyPurchase: handleSetIsCompanyPurchase,
    setMarketingConsent,
    updateAddressField,
  };
}
