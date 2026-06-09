import type { CheckoutAddressValues } from "@/lib/forms/checkout/address.form";

export type CarrierPickupAddress = {
  address: Pick<
    CheckoutAddressValues,
    "address1" | "address2" | "city" | "countryCode" | "postalCode"
  >;
  label: string;
};

const DEFAULT_PICKUP_COUNTRY = "SK";

export function resolveCarrierPickupAddress(
  data: unknown,
  fallbackCountryCode?: string,
): CarrierPickupAddress | null {
  if (!isRecord(data) || !readString(data.access_point_id)) {
    return null;
  }

  const label = readString(data.access_point_name) ?? "Výdajné miesto";
  const street = readString(data.access_point_street);
  const city = readString(data.access_point_city) ?? "";
  const postalCode = readString(data.access_point_zip) ?? "";
  const countryCode = (
    readString(data.access_point_country) ??
    fallbackCountryCode ??
    DEFAULT_PICKUP_COUNTRY
  ).toUpperCase();

  return {
    address: {
      address1: label,
      address2: street && street !== label ? street : "",
      city,
      countryCode,
      postalCode,
    },
    label,
  };
}

export function formatCarrierPickupAddress(address: CarrierPickupAddress) {
  const addressParts = [
    address.address.address2,
    address.address.postalCode,
    address.address.city,
  ].filter(Boolean);

  return addressParts.length > 0
    ? addressParts.join(", ")
    : address.address.countryCode;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : undefined;
}
