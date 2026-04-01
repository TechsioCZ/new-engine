import type { HttpTypes } from "@medusajs/types";
import type { IconType } from "@techsio/ui-kit/atoms/icon";
import { COUNTRY_SELECT_ITEMS } from "./checkout.constants";

const normalizeProviderValue = (providerId: string) => {
  return providerId.toLowerCase().replace(/[_-]+/g, " ");
};

export const resolveProviderLabel = (providerId: string) => {
  if (!providerId) {
    return "Neznámy poskytovateľ";
  }

  const normalizedValue = normalizeProviderValue(providerId);
  if (normalizedValue.includes("paypal")) {
    return "PayPal";
  }

  if (normalizedValue.includes("bank") || normalizedValue.includes("wire")) {
    return "Platba bankovým prevodom";
  }

  if (normalizedValue.includes("cod") || normalizedValue.includes("cash")) {
    return "Na dobierku";
  }

  if (
    normalizedValue.includes("card") ||
    normalizedValue.includes("stripe") ||
    normalizedValue.includes("google") ||
    normalizedValue.includes("apple") ||
    normalizedValue.includes("system default")
  ) {
    return "Platba kartou online";
  }

  return providerId
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const resolvePaymentSummaryLabel = (providerId: string) => {
  if (!providerId) {
    return "Neznámy poskytovateľ";
  }

  const normalizedValue = normalizeProviderValue(providerId);
  if (
    normalizedValue.includes("card") ||
    normalizedValue.includes("stripe") ||
    normalizedValue.includes("google") ||
    normalizedValue.includes("apple") ||
    normalizedValue.includes("system default")
  ) {
    return "Platba kartou, Google Pay alebo Apple Pay";
  }

  return resolveProviderLabel(providerId);
};

export const resolveSelectedPaymentProviderId = (
  cart: HttpTypes.StoreCart | null | undefined,
) => {
  const paymentSessions = cart?.payment_collection?.payment_sessions;
  if (!paymentSessions?.length) {
    return undefined;
  }

  type PaymentSessionWithSelection = HttpTypes.StorePaymentSession & {
    is_selected?: boolean;
  };
  const selectedPaymentSession =
    paymentSessions.find(
      (session) =>
        (session as PaymentSessionWithSelection).is_selected === true,
    ) ?? paymentSessions[0];

  return selectedPaymentSession?.provider_id;
};

export const resolvePaymentIcon = (providerId: string): IconType => {
  const normalizedValue = normalizeProviderValue(providerId);

  if (normalizedValue.includes("paypal")) {
    return "icon-[mdi--paypal]";
  }

  if (
    normalizedValue.includes("card") ||
    normalizedValue.includes("stripe") ||
    normalizedValue.includes("google") ||
    normalizedValue.includes("apple") ||
    normalizedValue.includes("system default")
  ) {
    return "icon-[mdi--credit-card-outline]";
  }

  if (normalizedValue.includes("bank") || normalizedValue.includes("wire")) {
    return "icon-[mdi--bank-outline]";
  }

  if (normalizedValue.includes("cod") || normalizedValue.includes("cash")) {
    return "icon-[mdi--cash-multiple]";
  }

  return "icon-[mdi--wallet-outline]";
};

export const resolveShippingIcon = (option: {
  id?: string | null;
  name?: string | null;
}): IconType => {
  const normalizedValue =
    `${option.name ?? ""} ${option.id ?? ""}`.toLowerCase();

  if (
    normalizedValue.includes("packeta") ||
    normalizedValue.includes("box") ||
    normalizedValue.includes("pickup") ||
    normalizedValue.includes("predaj")
  ) {
    return "icon-[mdi--package-variant-closed]";
  }

  if (
    normalizedValue.includes("express") ||
    normalizedValue.includes("kurier") ||
    normalizedValue.includes("courier")
  ) {
    return "icon-[mdi--truck-fast-outline]";
  }

  if (normalizedValue.includes("eko") || normalizedValue.includes("eco")) {
    return "icon-[mdi--leaf]";
  }

  return "icon-[mdi--truck-delivery-outline]";
};

export const resolveCountryLabel = (countryCode: string) => {
  const normalizedCountryCode = countryCode.trim().toUpperCase();
  if (!normalizedCountryCode) {
    return "";
  }

  const matchedCountry = COUNTRY_SELECT_ITEMS.find(
    (item) => item.value?.toUpperCase() === normalizedCountryCode,
  );

  return typeof matchedCountry?.label === "string"
    ? matchedCountry.label
    : normalizedCountryCode;
};
