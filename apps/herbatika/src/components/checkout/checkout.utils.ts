import type { HttpTypes } from "@medusajs/types";
import { CHECKOUT_STEPS, type AddressFormState } from "./checkout.constants";

const isObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const resolveCartTotalAmount = (
  cart: HttpTypes.StoreCart | null | undefined,
) => {
  if (!cart) {
    return 0;
  }

  if (typeof cart.total === "number") {
    return cart.total;
  }

  if (typeof cart.subtotal === "number") {
    return cart.subtotal;
  }

  return 0;
};

export const resolveLineItemTotalAmount = (item: HttpTypes.StoreCartLineItem) => {
  if (typeof item.total === "number") {
    return item.total;
  }

  if (typeof item.subtotal === "number") {
    return item.subtotal;
  }

  const unitPrice = typeof item.unit_price === "number" ? item.unit_price : 0;
  const quantity = typeof item.quantity === "number" ? item.quantity : 1;
  return unitPrice * quantity;
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

export const buildMissingFieldMessage = (form: AddressFormState) => {
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
  return item.title ?? item.product_title ?? item.variant_title ?? item.id;
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

  if (!params.hasStoredAddress) {
    return 1;
  }

  if (!params.hasShipping) {
    return 2;
  }

  if (!params.hasPayment) {
    return 3;
  }

  return CHECKOUT_STEPS.length - 1;
};
