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

export const resolvePaymentIcon = (providerId: string): IconType => {
  const normalizedValue = normalizeProviderValue(providerId);

  if (normalizedValue.includes("paypal")) {
    return "token-icon-paypal";
  }

  if (
    normalizedValue.includes("card") ||
    normalizedValue.includes("stripe") ||
    normalizedValue.includes("google") ||
    normalizedValue.includes("apple") ||
    normalizedValue.includes("system default")
  ) {
    return "token-icon-credit-card";
  }

  if (normalizedValue.includes("bank") || normalizedValue.includes("wire")) {
    return "token-icon-bank";
  }

  if (normalizedValue.includes("cod") || normalizedValue.includes("cash")) {
    return "token-icon-cash";
  }

  return "token-icon-wallet";
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
    return "token-icon-box";
  }

  if (
    normalizedValue.includes("express") ||
    normalizedValue.includes("kurier") ||
    normalizedValue.includes("courier")
  ) {
    return "token-icon-truck-fast";
  }

  if (normalizedValue.includes("eko") || normalizedValue.includes("eco")) {
    return "token-icon-leaf";
  }

  return "token-icon-truck";
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
