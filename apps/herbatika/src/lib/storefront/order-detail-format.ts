import type { HttpTypes } from "@medusajs/types";

type OrderRecord = Record<string, unknown>;

export type OrderAddressSummary = {
  fullName: string | null;
  company: string | null;
  lines: string[];
};

const isRecord = (value: unknown): value is OrderRecord => {
  return typeof value === "object" && value !== null;
};

const readString = (value: unknown) => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readFromRecord = (record: OrderRecord, keys: string[]) => {
  for (const key of keys) {
    const value = readString(record[key]);
    if (value) {
      return value;
    }
  }

  return null;
};

const formatCountry = (value: string | null) => {
  if (!value) {
    return null;
  }

  return value.length === 2 ? value.toUpperCase() : value;
};

const toAddressSummary = (value: unknown): OrderAddressSummary | null => {
  if (!isRecord(value)) {
    return null;
  }

  const firstName = readFromRecord(value, ["first_name", "firstName"]);
  const lastName = readFromRecord(value, ["last_name", "lastName"]);
  const company = readFromRecord(value, ["company"]);
  const address1 = readFromRecord(value, ["address_1", "address1"]);
  const address2 = readFromRecord(value, ["address_2", "address2"]);
  const city = readFromRecord(value, ["city", "town"]);
  const postalCode = readFromRecord(value, ["postal_code", "postalCode", "zip"]);
  const province = readFromRecord(value, ["province", "state"]);
  const countryCode = formatCountry(
    readFromRecord(value, ["country_code", "countryCode", "country"]),
  );
  const phone = readFromRecord(value, ["phone"]);

  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const cityLine = [postalCode, city].filter(Boolean).join(" ").trim() || null;

  const lines = [address1, address2, cityLine, province, countryCode, phone].filter(
    (line): line is string => Boolean(line),
  );

  if (!fullName && !company && lines.length === 0) {
    return null;
  }

  return {
    fullName,
    company,
    lines,
  };
};

const readMethodLabel = (candidate: unknown) => {
  if (!isRecord(candidate)) {
    return null;
  }

  const directLabel = readFromRecord(candidate, [
    "name",
    "label",
    "provider_id",
    "providerId",
    "id",
  ]);
  if (directLabel) {
    return directLabel;
  }

  const nestedCandidates = [
    candidate.option,
    candidate.shipping_option,
    candidate.shippingOption,
    candidate.provider,
    candidate.payment_provider,
    candidate.paymentProvider,
  ];

  for (const nestedCandidate of nestedCandidates) {
    if (!isRecord(nestedCandidate)) {
      continue;
    }

    const nestedLabel = readFromRecord(nestedCandidate, [
      "name",
      "label",
      "provider_id",
      "providerId",
      "id",
    ]);

    if (nestedLabel) {
      return nestedLabel;
    }
  }

  return null;
};

const readMetadataValue = (metadata: unknown, keys: string[]) => {
  if (!isRecord(metadata)) {
    return null;
  }

  return readFromRecord(metadata, keys);
};

export const resolveOrderContactEmail = (
  order: HttpTypes.StoreOrder,
  fallbackEmail?: string | null,
) => {
  return readString(order.email) ?? readString(fallbackEmail) ?? "-";
};

export const resolveOrderAddresses = (order: HttpTypes.StoreOrder) => {
  return {
    shipping: toAddressSummary((order as { shipping_address?: unknown }).shipping_address),
    billing: toAddressSummary((order as { billing_address?: unknown }).billing_address),
  };
};

export const resolveOrderShippingMethodLabel = (order: HttpTypes.StoreOrder) => {
  const shippingMethods = (order as { shipping_methods?: unknown }).shipping_methods;
  if (!Array.isArray(shippingMethods) || shippingMethods.length === 0) {
    return null;
  }

  return readMethodLabel(shippingMethods[0]);
};

export const resolveOrderPaymentMethodLabel = (order: HttpTypes.StoreOrder) => {
  const transactions = (order as { transactions?: unknown }).transactions;
  if (Array.isArray(transactions) && transactions.length > 0) {
    const transactionLabel = readMethodLabel(transactions[0]);
    if (transactionLabel) {
      return transactionLabel;
    }
  }

  const paymentCollections = (order as { payment_collections?: unknown }).payment_collections;
  if (Array.isArray(paymentCollections) && paymentCollections.length > 0) {
    const paymentCollectionLabel = readMethodLabel(paymentCollections[0]);
    if (paymentCollectionLabel) {
      return paymentCollectionLabel;
    }
  }

  return null;
};

export const resolveOrderTrackingCode = (order: HttpTypes.StoreOrder) => {
  return readMetadataValue((order as { metadata?: unknown }).metadata, [
    "tracking_number",
    "trackingNumber",
    "shipment_tracking",
    "shipmentTracking",
    "tracking_code",
    "trackingCode",
  ]);
};
