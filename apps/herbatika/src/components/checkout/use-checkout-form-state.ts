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

type AddressFormTouchedState = Partial<Record<keyof AddressFormState, true>>;

export function useCheckoutFormState({
  cart,
  customer,
  isCartLoading,
  isCustomerLoading,
  regionCountryCode,
}: UseCheckoutFormStateProps) {
  const [addressForm, setAddressForm] =
    useState<AddressFormState>(DEFAULT_ADDRESS_FORM);
  const [touchedAddressFields, setTouchedAddressFields] =
    useState<AddressFormTouchedState>({});
  const [isCompanyPurchase, setIsCompanyPurchase] = useState(false);
  const [isCompanyPurchaseTouched, setIsCompanyPurchaseTouched] =
    useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [heurekaConsent, setHeurekaConsent] = useState(false);

  const baseAddress = cart?.billing_address ?? cart?.shipping_address;
  const resolvedAddressValues = useMemo(
    () => mapHerbatikaAddressFormStateFromMedusaAddress(baseAddress),
    [baseAddress],
  );
  const canPrefillAddress = !isCartLoading && !isCustomerLoading;

  useEffect(() => {
    if (!canPrefillAddress) {
      return;
    }

    setAddressForm((previous) => ({
      ...previous,
      email: touchedAddressFields.email
        ? previous.email
        : cart?.email ?? customer?.email ?? previous.email,
      firstName: touchedAddressFields.firstName
        ? previous.firstName
        : resolvedAddressValues.firstName ??
          customer?.first_name ??
          previous.firstName,
      lastName: touchedAddressFields.lastName
        ? previous.lastName
        : resolvedAddressValues.lastName ??
          customer?.last_name ??
          previous.lastName,
      phone: touchedAddressFields.phone
        ? previous.phone
        : resolvedAddressValues.phone ?? previous.phone,
      company: touchedAddressFields.company
        ? previous.company
        : resolvedAddressValues.company ?? previous.company,
      companyId: touchedAddressFields.companyId
        ? previous.companyId
        : resolvedAddressValues.companyId ?? previous.companyId,
      taxId: touchedAddressFields.taxId
        ? previous.taxId
        : resolvedAddressValues.taxId ?? previous.taxId,
      vatId: touchedAddressFields.vatId
        ? previous.vatId
        : resolvedAddressValues.vatId ?? previous.vatId,
      address1: touchedAddressFields.address1
        ? previous.address1
        : resolvedAddressValues.address1 ?? previous.address1,
      address2: touchedAddressFields.address2
        ? previous.address2
        : resolvedAddressValues.address2 ?? previous.address2,
      city: touchedAddressFields.city
        ? previous.city
        : resolvedAddressValues.city ?? previous.city,
      postalCode: touchedAddressFields.postalCode
        ? previous.postalCode
        : resolvedAddressValues.postalCode ?? previous.postalCode,
      countryCode: touchedAddressFields.countryCode
        ? previous.countryCode
        : resolvedAddressValues.countryCode ??
          regionCountryCode?.toUpperCase() ??
          previous.countryCode,
      customerNote: touchedAddressFields.customerNote
        ? previous.customerNote
        : resolvedAddressValues.customerNote ?? previous.customerNote,
    }));
    if (!isCompanyPurchaseTouched) {
      setIsCompanyPurchase(Boolean(baseAddress?.company));
    }
  }, [
    baseAddress?.company,
    canPrefillAddress,
    customer?.email,
    customer?.first_name,
    customer?.last_name,
    cart?.email,
    isCompanyPurchaseTouched,
    regionCountryCode,
    resolvedAddressValues,
    touchedAddressFields,
  ]);

  const updateAddressField = <K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => {
    setTouchedAddressFields((previous) => ({
      ...previous,
      [key]: true,
    }));
    setAddressForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSetIsCompanyPurchase = (value: boolean) => {
    setIsCompanyPurchaseTouched(true);
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
