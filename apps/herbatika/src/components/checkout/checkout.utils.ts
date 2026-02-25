import type { HttpTypes } from "@medusajs/types";
import {
  resolveCartItemName as resolveCartItemNameShared,
  resolveCartTotalAmount as resolveCartTotalAmountShared,
  resolveLineItemTotalAmount as resolveLineItemTotalAmountShared,
} from "@/lib/storefront/cart-calculations";
import { CHECKOUT_STEPS, type AddressFormState } from "./checkout.constants";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const resolveCartTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
) => {
  return resolveCartTotalAmountShared(cart);
};

export const resolveLineItemTotalAmount = (item: HttpTypes.StoreCartLineItem) => {
  return resolveLineItemTotalAmountShared(item);
};

export const resolveOrderId = (result: unknown) => {
  if (!isObject(result)) {
    return null;
  }

  if (
    result.type === "order" &&
    isObject(result.order) &&
    typeof result.order.id === "string"
  ) {
    return result.order.id;
  }

  if (isObject(result.order) && typeof result.order.id === "string") {
    return result.order.id;
  }

  return null;
};

export const resolveCompleteCartFailure = (result: unknown) => {
  if (!isObject(result)) {
    return null;
  }

  if (
    result.type === "cart" &&
    isObject(result.error) &&
    typeof result.error.message === "string"
  ) {
    return result.error.message;
  }

  return null;
};

export const buildMissingFieldMessage = (
  form: AddressFormState,
  isCompanyPurchase: boolean,
) => {
  const missing: string[] = [];

  if (!form.email.trim()) {
    missing.push("email");
  }
  if (!form.firstName.trim()) {
    missing.push("meno");
  }
  if (!form.lastName.trim()) {
    missing.push("priezvisko");
  }
  if (!form.phone.trim()) {
    missing.push("telefón");
  }
  if (!form.address1.trim()) {
    missing.push("ulica");
  }
  if (!form.city.trim()) {
    missing.push("mesto");
  }
  if (!form.postalCode.trim()) {
    missing.push("PSČ");
  }
  if (!form.countryCode.trim()) {
    missing.push("krajina");
  }
  if (isCompanyPurchase) {
    if (!form.company.trim()) {
      missing.push("názov firmy");
    }
    if (!form.companyId.trim()) {
      missing.push("IČO");
    }
    if (!form.taxId.trim()) {
      missing.push("DIČ");
    }
  }

  if (missing.length === 0) {
    return null;
  }

  return `Vyplňte povinné polia: ${missing.join(", ")}`;
};

export const resolveProviderLabel = (providerId: string) => {
  if (!providerId) {
    return "Neznámy poskytovateľ";
  }

  return providerId
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const resolveCartItemName = (item: HttpTypes.StoreCartLineItem) => {
  return resolveCartItemNameShared(item);
};

export const resolveHasStoredAddress = (
  cart: HttpTypes.StoreCart | null | undefined,
) => {
  if (!cart?.email) {
    return false;
  }

  const address = cart.billing_address ?? cart.shipping_address;
  if (!address) {
    return false;
  }

  return Boolean(
    address.first_name &&
      address.last_name &&
      address.address_1 &&
      address.city &&
      address.postal_code &&
      address.country_code,
  );
};

export const resolveCheckoutStepIndex = (params: {
  hasItems: boolean;
  hasStoredAddress: boolean;
  hasShipping: boolean;
  hasPayment: boolean;
}) => {
  if (!params.hasItems) {
    return 0;
  }

  if (!params.hasShipping || !params.hasPayment) {
    return 1;
  }

  if (!params.hasStoredAddress) {
    return 2;
  }

  return CHECKOUT_STEPS.length - 1;
};
