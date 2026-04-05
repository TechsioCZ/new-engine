"use client";

import type { HttpTypes } from "@medusajs/types";
import { useEffect, useMemo, useState } from "react";
import { mapHerbatikaAddressFormStateFromMedusaAddress } from "@/lib/storefront/cart/address-adapter";
import {
  type AddressFormState,
  DEFAULT_ADDRESS_FORM,
} from "./checkout.constants";
import { resolveAddressFormsMatch } from "./checkout-address.utils";

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
  const [shippingAddressForm, setShippingAddressForm] =
    useState<AddressFormState>(DEFAULT_ADDRESS_FORM);
  const [billingAddressForm, setBillingAddressForm] =
    useState<AddressFormState>(DEFAULT_ADDRESS_FORM);
  const [touchedShippingAddressFields, setTouchedShippingAddressFields] =
    useState<AddressFormTouchedState>({});
  const [touchedBillingAddressFields, setTouchedBillingAddressFields] =
    useState<AddressFormTouchedState>({});
  const [useSameAddress, setUseSameAddressState] = useState(true);
  const [isUseSameAddressTouched, setIsUseSameAddressTouched] = useState(false);
  const [isCompanyPurchase, setIsCompanyPurchase] = useState(false);
  const [isCompanyPurchaseTouched, setIsCompanyPurchaseTouched] =
    useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [heurekaConsent, setHeurekaConsent] = useState(false);

  const shippingAddress = cart?.shipping_address ?? cart?.billing_address;
  const billingAddress = cart?.billing_address ?? cart?.shipping_address;
  const resolvedShippingAddressValues = useMemo(
    () => mapHerbatikaAddressFormStateFromMedusaAddress(shippingAddress),
    [shippingAddress],
  );
  const resolvedBillingAddressValues = useMemo(
    () => mapHerbatikaAddressFormStateFromMedusaAddress(billingAddress),
    [billingAddress],
  );
  const resolvedUseSameAddress = useMemo(() => {
    if (!(shippingAddress || billingAddress)) {
      return true;
    }

    return resolveAddressFormsMatch(
      resolvedShippingAddressValues,
      resolvedBillingAddressValues,
    );
  }, [
    billingAddress,
    resolvedBillingAddressValues,
    resolvedShippingAddressValues,
    shippingAddress,
  ]);
  const canPrefillAddress = !isCartLoading && !isCustomerLoading;

  useEffect(() => {
    if (!canPrefillAddress) {
      return;
    }

    setShippingAddressForm((previous) => ({
      ...previous,
      email: touchedShippingAddressFields.email
        ? previous.email
        : cart?.email ?? customer?.email ?? previous.email,
      firstName: touchedShippingAddressFields.firstName
        ? previous.firstName
        : resolvedShippingAddressValues.firstName ??
          customer?.first_name ??
          previous.firstName,
      lastName: touchedShippingAddressFields.lastName
        ? previous.lastName
        : resolvedShippingAddressValues.lastName ??
          customer?.last_name ??
          previous.lastName,
      phone: touchedShippingAddressFields.phone
        ? previous.phone
        : resolvedShippingAddressValues.phone ?? previous.phone,
      company: touchedShippingAddressFields.company
        ? previous.company
        : resolvedShippingAddressValues.company ?? previous.company,
      companyId: touchedShippingAddressFields.companyId
        ? previous.companyId
        : resolvedShippingAddressValues.companyId ?? previous.companyId,
      taxId: touchedShippingAddressFields.taxId
        ? previous.taxId
        : resolvedShippingAddressValues.taxId ?? previous.taxId,
      vatId: touchedShippingAddressFields.vatId
        ? previous.vatId
        : resolvedShippingAddressValues.vatId ?? previous.vatId,
      address1: touchedShippingAddressFields.address1
        ? previous.address1
        : resolvedShippingAddressValues.address1 ?? previous.address1,
      address2: touchedShippingAddressFields.address2
        ? previous.address2
        : resolvedShippingAddressValues.address2 ?? previous.address2,
      city: touchedShippingAddressFields.city
        ? previous.city
        : resolvedShippingAddressValues.city ?? previous.city,
      postalCode: touchedShippingAddressFields.postalCode
        ? previous.postalCode
        : resolvedShippingAddressValues.postalCode ?? previous.postalCode,
      countryCode: touchedShippingAddressFields.countryCode
        ? previous.countryCode
        : resolvedShippingAddressValues.countryCode ??
          regionCountryCode?.toUpperCase() ??
          previous.countryCode,
      customerNote: touchedShippingAddressFields.customerNote
        ? previous.customerNote
        : resolvedShippingAddressValues.customerNote ?? previous.customerNote,
    }));

    setBillingAddressForm((previous) => ({
      ...previous,
      firstName: touchedBillingAddressFields.firstName
        ? previous.firstName
        : resolvedBillingAddressValues.firstName ?? previous.firstName,
      lastName: touchedBillingAddressFields.lastName
        ? previous.lastName
        : resolvedBillingAddressValues.lastName ?? previous.lastName,
      phone: touchedBillingAddressFields.phone
        ? previous.phone
        : resolvedBillingAddressValues.phone ?? previous.phone,
      company: touchedBillingAddressFields.company
        ? previous.company
        : resolvedBillingAddressValues.company ?? previous.company,
      companyId: touchedBillingAddressFields.companyId
        ? previous.companyId
        : resolvedBillingAddressValues.companyId ?? previous.companyId,
      taxId: touchedBillingAddressFields.taxId
        ? previous.taxId
        : resolvedBillingAddressValues.taxId ?? previous.taxId,
      vatId: touchedBillingAddressFields.vatId
        ? previous.vatId
        : resolvedBillingAddressValues.vatId ?? previous.vatId,
      address1: touchedBillingAddressFields.address1
        ? previous.address1
        : resolvedBillingAddressValues.address1 ?? previous.address1,
      address2: touchedBillingAddressFields.address2
        ? previous.address2
        : resolvedBillingAddressValues.address2 ?? previous.address2,
      city: touchedBillingAddressFields.city
        ? previous.city
        : resolvedBillingAddressValues.city ?? previous.city,
      postalCode: touchedBillingAddressFields.postalCode
        ? previous.postalCode
        : resolvedBillingAddressValues.postalCode ?? previous.postalCode,
      countryCode: touchedBillingAddressFields.countryCode
        ? previous.countryCode
        : resolvedBillingAddressValues.countryCode ??
          regionCountryCode?.toUpperCase() ??
          previous.countryCode,
    }));
    if (!isCompanyPurchaseTouched) {
      setIsCompanyPurchase(Boolean(billingAddress?.company ?? shippingAddress?.company));
    }
    if (!isUseSameAddressTouched) {
      setUseSameAddressState(resolvedUseSameAddress);
    }
  }, [
    billingAddress?.company,
    canPrefillAddress,
    customer?.email,
    customer?.first_name,
    customer?.last_name,
    cart?.email,
    isCompanyPurchaseTouched,
    isUseSameAddressTouched,
    regionCountryCode,
    resolvedBillingAddressValues,
    resolvedShippingAddressValues,
    resolvedUseSameAddress,
    shippingAddress?.company,
    touchedBillingAddressFields,
    touchedShippingAddressFields,
  ]);

  useEffect(() => {
    if (
      useSameAddress ||
      Object.keys(touchedBillingAddressFields).length > 0 ||
      billingAddress
    ) {
      return;
    }

    setBillingAddressForm((previous) => ({
      ...previous,
      firstName: shippingAddressForm.firstName,
      lastName: shippingAddressForm.lastName,
      phone: shippingAddressForm.phone,
      company: shippingAddressForm.company,
      companyId: shippingAddressForm.companyId,
      taxId: shippingAddressForm.taxId,
      vatId: shippingAddressForm.vatId,
      address1: shippingAddressForm.address1,
      address2: shippingAddressForm.address2,
      city: shippingAddressForm.city,
      postalCode: shippingAddressForm.postalCode,
      countryCode: shippingAddressForm.countryCode,
    }));
  }, [billingAddress, shippingAddressForm, touchedBillingAddressFields, useSameAddress]);

  const updateShippingAddressField = <K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => {
    setTouchedShippingAddressFields((previous) => ({
      ...previous,
      [key]: true,
    }));
    setShippingAddressForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const updateBillingAddressField = <K extends keyof AddressFormState>(
    key: K,
    value: AddressFormState[K],
  ) => {
    setTouchedBillingAddressFields((previous) => ({
      ...previous,
      [key]: true,
    }));
    setBillingAddressForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSetIsCompanyPurchase = (value: boolean) => {
    setIsCompanyPurchaseTouched(true);
    setIsCompanyPurchase(value);
  };

  const setUseSameAddress = (value: boolean) => {
    setIsUseSameAddressTouched(true);
    setUseSameAddressState(value);
  };

  return {
    billingAddressForm,
    heurekaConsent,
    isCompanyPurchase,
    marketingConsent,
    setUseSameAddress,
    shippingAddressForm,
    setHeurekaConsent,
    setIsCompanyPurchase: handleSetIsCompanyPurchase,
    setMarketingConsent,
    updateBillingAddressField,
    updateShippingAddressField,
    useSameAddress,
  };
}
