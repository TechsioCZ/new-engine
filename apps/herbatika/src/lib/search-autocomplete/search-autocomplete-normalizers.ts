import { createBrandSlug } from "@/lib/storefront/brands";

export type CurrencyCode = "EUR" | "CZK";

const DEFAULT_CURRENCY_CODE: CurrencyCode = "EUR";

export const normalizeString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

export const normalizeCurrencyCode = (value?: string | null): CurrencyCode =>
  value?.trim().toUpperCase() === "CZK" ? "CZK" : DEFAULT_CURRENCY_CODE;

export const normalizeComparable = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("sk");

export const createHandleLabel = (handle: string) => {
  const label = handle.replaceAll(/[-_]+/g, " ").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "Kategória";
};

export const resolveProducerSlug = (handle: string, title: string) => {
  const producerPathMatch = handle.match(/\/producers\/([^/]+)/);
  return createBrandSlug(producerPathMatch?.[1] || handle || title);
};
