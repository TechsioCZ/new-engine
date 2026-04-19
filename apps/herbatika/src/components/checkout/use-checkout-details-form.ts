"use client";

import { useStore } from "@tanstack/react-form";
import type { HttpTypes } from "@medusajs/types";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CHECKOUT_BILLING_ACTIVE_FIELD_NAMES,
  CHECKOUT_BILLING_COMPANY_FIELD_NAMES,
  CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES,
  type CheckoutScopedFieldName,
  resolveAddressFormsMatch,
} from "@/components/checkout/checkout-address.utils";
import {
  CHECKOUT_ADDRESS_FIELDS,
  DEFAULT_CHECKOUT_ADDRESS_VALUES,
  type CheckoutAddressDetailsValues,
  type CheckoutAddressValues,
  type CheckoutDetailsValues,
  resolveEffectiveCheckoutAddressDetails,
} from "@/lib/forms/checkout/address.form";
import { useHerbatikaForm } from "@/lib/forms/core/herbatika-form";
import { mapHerbatikaAddressFormStateFromMedusaAddress } from "@/lib/storefront/cart/address-adapter";

type UseCheckoutDetailsFormProps = {
  cart: HttpTypes.StoreCart | null | undefined;
  customer: HttpTypes.StoreCustomer | null | undefined;
  isCartLoading: boolean;
  isCustomerLoading: boolean;
  onSubmit: (values: CheckoutDetailsValues) => Promise<void>;
  regionCountryCode?: string;
};

type CheckoutTogglePreferences = Pick<
  CheckoutDetailsValues,
  "isCompanyPurchase" | "useSameAddress"
>;

const LOCAL_ONLY_ADDRESS_FIELDS = [
  "companyId",
  "customerNote",
  "taxId",
  "vatId",
] as const satisfies ReadonlyArray<keyof CheckoutAddressValues>;

type LocalOnlyAddressField = (typeof LOCAL_ONLY_ADDRESS_FIELDS)[number];
type CheckoutLocalOnlyAddressValues = Record<LocalOnlyAddressField, string>;
type CheckoutStoredState = Partial<CheckoutTogglePreferences> & {
  billing?: CheckoutLocalOnlyAddressValues;
  shipping?: CheckoutLocalOnlyAddressValues;
};

const mergeCheckoutAddressValues = (
  ...sources: Array<Partial<CheckoutAddressValues> | null | undefined>
): CheckoutAddressValues => {
  const nextValues = { ...DEFAULT_CHECKOUT_ADDRESS_VALUES };

  for (const source of sources) {
    if (!source) {
      continue;
    }

    for (const field of CHECKOUT_ADDRESS_FIELDS) {
      const value = source[field];

      if (typeof value === "string") {
        nextValues[field] = value;
      }
    }
  }

  return nextValues;
};

const createEmptyCheckoutLocalOnlyAddressValues =
  (): CheckoutLocalOnlyAddressValues => ({
    companyId: "",
    customerNote: "",
    taxId: "",
    vatId: "",
  });

const pickCheckoutLocalOnlyAddressValues = (
  address: CheckoutAddressValues,
): CheckoutLocalOnlyAddressValues => {
  const nextValues = createEmptyCheckoutLocalOnlyAddressValues();

  for (const field of LOCAL_ONLY_ADDRESS_FIELDS) {
    nextValues[field] = address[field].trim();
  }

  return nextValues;
};

const normalizeStoredAddressValues = (
  value: unknown,
): CheckoutLocalOnlyAddressValues | undefined => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return undefined;
  }

  const nextValues = createEmptyCheckoutLocalOnlyAddressValues();
  const recordValue = value as Partial<Record<LocalOnlyAddressField, unknown>>;

  for (const field of LOCAL_ONLY_ADDRESS_FIELDS) {
    const fieldValue = recordValue[field];

    if (typeof fieldValue === "string") {
      nextValues[field] = fieldValue;
    }
  }

  return nextValues;
};

const overlayStoredAddressValues = ({
  address,
  storedAddress,
}: {
  address: CheckoutAddressValues;
  storedAddress?: CheckoutLocalOnlyAddressValues;
}): CheckoutAddressValues => {
  if (!storedAddress) {
    return address;
  }

  const nextAddress = { ...address };

  for (const field of LOCAL_ONLY_ADDRESS_FIELDS) {
    if (nextAddress[field].trim().length > 0) {
      continue;
    }

    if (storedAddress[field].trim().length > 0) {
      nextAddress[field] = storedAddress[field];
    }
  }

  return nextAddress;
};

const createCheckoutToggleStorageKey = (cartId?: string | null) => {
  return cartId ? `herbatika.checkout-details.${cartId}` : null;
};

const readStoredCheckoutState = (
  storageKey: string | null,
): CheckoutStoredState => {
  if (!storageKey || typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue = window.sessionStorage.getItem(storageKey);

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue) as Partial<CheckoutTogglePreferences>;

    return {
      billing: normalizeStoredAddressValues(
        (parsedValue as CheckoutStoredState).billing,
      ),
      isCompanyPurchase:
        typeof parsedValue.isCompanyPurchase === "boolean"
          ? parsedValue.isCompanyPurchase
          : undefined,
      shipping: normalizeStoredAddressValues(
        (parsedValue as CheckoutStoredState).shipping,
      ),
      useSameAddress:
        typeof parsedValue.useSameAddress === "boolean"
          ? parsedValue.useSameAddress
          : undefined,
    };
  } catch {
    return {};
  }
};

const writeStoredCheckoutState = ({
  nextState,
  storageKey,
}: {
  nextState: CheckoutStoredState;
  storageKey: string | null;
}) => {
  if (!storageKey || typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(storageKey, JSON.stringify(nextState));
};

const resolveCheckoutHydratedValues = ({
  cart,
  customer,
  regionCountryCode,
}: Pick<
  UseCheckoutDetailsFormProps,
  "cart" | "customer" | "regionCountryCode"
>): CheckoutDetailsValues => {
  const shippingAddress = cart?.shipping_address ?? cart?.billing_address;
  const billingAddress = cart?.billing_address ?? cart?.shipping_address;
  const resolvedShippingAddressValues =
    mapHerbatikaAddressFormStateFromMedusaAddress(shippingAddress);
  const resolvedBillingAddressValues =
    mapHerbatikaAddressFormStateFromMedusaAddress(billingAddress);
  const shippingAddressValues = mergeCheckoutAddressValues(
    {
      email: cart?.email ?? customer?.email ?? "",
      firstName: customer?.first_name ?? "",
      lastName: customer?.last_name ?? "",
      countryCode: regionCountryCode?.toUpperCase(),
    },
    resolvedShippingAddressValues,
  );
  const billingAddressValues = mergeCheckoutAddressValues(
    {
      firstName: shippingAddressValues.firstName,
      lastName: shippingAddressValues.lastName,
      phone: shippingAddressValues.phone,
      company: shippingAddressValues.company,
      companyId: shippingAddressValues.companyId,
      taxId: shippingAddressValues.taxId,
      vatId: shippingAddressValues.vatId,
      address1: shippingAddressValues.address1,
      address2: shippingAddressValues.address2,
      city: shippingAddressValues.city,
      postalCode: shippingAddressValues.postalCode,
      countryCode: shippingAddressValues.countryCode,
    },
    resolvedBillingAddressValues,
  );
  const hasHydratedAddress = Boolean(shippingAddress || billingAddress);

  return {
    shipping: shippingAddressValues,
    billing: billingAddressValues,
    useSameAddress: hasHydratedAddress
      ? resolveAddressFormsMatch(shippingAddressValues, billingAddressValues)
      : true,
    isCompanyPurchase: Boolean(billingAddress?.company ?? shippingAddress?.company),
    marketingConsent: false,
    heurekaConsent: false,
  };
};

const resolveNextStoredCheckoutState = ({
  currentState,
  nextValues,
}: {
  currentState: CheckoutStoredState;
  nextValues: Partial<CheckoutAddressDetailsValues>;
}): CheckoutStoredState => {
  const effectiveValues =
    nextValues.billing && nextValues.shipping
      ? resolveEffectiveCheckoutAddressDetails({
          billing: nextValues.billing,
          isCompanyPurchase:
            nextValues.isCompanyPurchase ?? currentState.isCompanyPurchase ?? false,
          shipping: nextValues.shipping,
          useSameAddress: nextValues.useSameAddress ?? currentState.useSameAddress ?? true,
        })
      : undefined;

  return {
    ...currentState,
    ...(typeof nextValues.isCompanyPurchase === "boolean"
      ? { isCompanyPurchase: nextValues.isCompanyPurchase }
      : {}),
    ...(typeof nextValues.useSameAddress === "boolean"
      ? { useSameAddress: nextValues.useSameAddress }
      : {}),
    ...(effectiveValues
      ? {
          billing: pickCheckoutLocalOnlyAddressValues(effectiveValues.billing),
          shipping: pickCheckoutLocalOnlyAddressValues(effectiveValues.shipping),
        }
      : {}),
  };
};

const resolveStoredCheckoutTogglePreferences = ({
  currentPreferences,
  nextIsCompanyPurchase,
  nextUseSameAddress,
}: {
  currentPreferences: CheckoutStoredState;
  nextIsCompanyPurchase?: boolean;
  nextUseSameAddress?: boolean;
}) => {
  return resolveNextStoredCheckoutState({
    currentState: currentPreferences,
    nextValues: {
      ...(typeof nextIsCompanyPurchase === "boolean"
        ? { isCompanyPurchase: nextIsCompanyPurchase }
        : {}),
      ...(typeof nextUseSameAddress === "boolean"
        ? { useSameAddress: nextUseSameAddress }
        : {}),
    },
  });
};

const resolveStoredCheckoutStateFromValues = ({
  currentState,
  values,
}: {
  currentState: CheckoutStoredState;
  values: CheckoutDetailsValues;
}) => {
  return resolveNextStoredCheckoutState({
    currentState,
    nextValues: values,
  });
};

const resolveHydratedValuesWithStoredState = ({
  hydratedValues,
  storedState,
}: {
  hydratedValues: CheckoutDetailsValues;
  storedState: CheckoutStoredState;
}): CheckoutDetailsValues => {
  const valuesWithLocalFields = {
    ...hydratedValues,
    billing: overlayStoredAddressValues({
      address: hydratedValues.billing,
      storedAddress: storedState.billing,
    }),
    shipping: overlayStoredAddressValues({
      address: hydratedValues.shipping,
      storedAddress: storedState.shipping,
    }),
  };

  return {
    ...valuesWithLocalFields,
    isCompanyPurchase:
      typeof storedState.isCompanyPurchase === "boolean"
        ? storedState.isCompanyPurchase
        : hydratedValues.isCompanyPurchase,
    useSameAddress:
      typeof storedState.useSameAddress === "boolean"
        ? storedState.useSameAddress
        : hydratedValues.useSameAddress,
  };
};

export function useCheckoutDetailsForm({
  cart,
  customer,
  isCartLoading,
  isCustomerLoading,
  onSubmit,
  regionCountryCode,
}: UseCheckoutDetailsFormProps) {
  const hydratedValues = useMemo(() => {
    return resolveCheckoutHydratedValues({
      cart,
      customer,
      regionCountryCode,
    });
  }, [cart, customer, regionCountryCode]);
  const toggleStorageKey = useMemo(() => {
    return createCheckoutToggleStorageKey(cart?.id);
  }, [cart?.id]);
  const [storedState, setStoredState] = useState<CheckoutStoredState>(() => {
    return readStoredCheckoutState(toggleStorageKey);
  });
  const hydratedValuesWithTogglePreferences = useMemo(() => {
    return resolveHydratedValuesWithStoredState({
      hydratedValues,
      storedState,
    });
  }, [hydratedValues, storedState]);
  const form = useHerbatikaForm({
    defaultValues: hydratedValuesWithTogglePreferences,
    onSubmit: async ({ value }) => {
      await onSubmit(value);
    },
  });

  const values = useStore(form.store, (state) => state.values as CheckoutDetailsValues);
  const isDirty = useStore(form.store, (state) => state.isDirty);
  const effectiveValues = useMemo(() => {
    return resolveEffectiveCheckoutAddressDetails(values);
  }, [values]);
  const lastHydratedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setStoredState(readStoredCheckoutState(toggleStorageKey));
  }, [toggleStorageKey]);

  useEffect(() => {
    if (isCartLoading || isCustomerLoading || isDirty) {
      return;
    }

    const nextHydratedKey = JSON.stringify(hydratedValuesWithTogglePreferences);

    if (lastHydratedKeyRef.current === nextHydratedKey) {
      return;
    }

    form.reset(hydratedValuesWithTogglePreferences);
    lastHydratedKeyRef.current = nextHydratedKey;
  }, [
    form,
    hydratedValuesWithTogglePreferences,
    isCartLoading,
    isCustomerLoading,
    isDirty,
  ]);

  const resetToValues = (nextValues: CheckoutDetailsValues) => {
    const nextStoredState = resolveStoredCheckoutStateFromValues({
      currentState: storedState,
      values: nextValues,
    });

    setStoredState(nextStoredState);
    writeStoredCheckoutState({
      nextState: nextStoredState,
      storageKey: toggleStorageKey,
    });
    form.reset(nextValues);
    lastHydratedKeyRef.current = JSON.stringify(nextValues);
  };

  const copyShippingIntoBilling = () => {
    const nextBillingValues = mergeCheckoutAddressValues(values.shipping);

    for (const field of CHECKOUT_ADDRESS_FIELDS) {
      form.setFieldValue(`billing.${field}`, nextBillingValues[field]);
    }
  };

  const clearFieldValidationState = (
    fieldNames: readonly CheckoutScopedFieldName[],
  ) => {
    for (const fieldName of fieldNames) {
      form.setFieldMeta(fieldName, (previous) => ({
        ...previous,
        errorMap: {},
        errorSourceMap: {},
        isBlurred: false,
        isTouched: false,
        isValidating: false,
      }));
    }
  };

  const trackUseSameAddressIntent = (nextValue: boolean) => {
    const nextTogglePreferences = resolveStoredCheckoutTogglePreferences({
      currentPreferences: storedState,
      nextUseSameAddress: nextValue,
    });

    setStoredState(nextTogglePreferences);
    writeStoredCheckoutState({
      nextState: nextTogglePreferences,
      storageKey: toggleStorageKey,
    });

    if (nextValue) {
      clearFieldValidationState(CHECKOUT_BILLING_ACTIVE_FIELD_NAMES);
      return;
    }

    if (values.isCompanyPurchase) {
      clearFieldValidationState(CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES);
    }
  };

  const setCompanyPurchase = (nextValue: boolean) => {
    const nextTogglePreferences = resolveStoredCheckoutTogglePreferences({
      currentPreferences: storedState,
      nextIsCompanyPurchase: nextValue,
    });

    setStoredState(nextTogglePreferences);
    writeStoredCheckoutState({
      nextState: nextTogglePreferences,
      storageKey: toggleStorageKey,
    });
    form.setFieldValue("isCompanyPurchase", nextValue);

    if (nextValue) {
      return;
    }

    clearFieldValidationState(
      values.useSameAddress
        ? CHECKOUT_SHIPPING_COMPANY_FIELD_NAMES
        : CHECKOUT_BILLING_COMPANY_FIELD_NAMES,
    );
  };

  return {
    copyShippingIntoBilling,
    effectiveValues,
    form,
    hasStoredBillingAddress: Boolean(cart?.billing_address),
    hydratedValues,
    isDirty,
    resetToValues,
    setCompanyPurchase,
    trackUseSameAddressIntent,
    values,
  };
}

export type CheckoutDetailsFormController = ReturnType<
  typeof useCheckoutDetailsForm
>;
