import type { ProductLocationAvailability, ProductLocationAvailabilityId } from "@/components/product-detail/product-detail.types";
import {
  HIGH_AVAILABILITY_LABEL,
  HIGH_AVAILABILITY_THRESHOLD,
  LOCATION_COLLECTION_KEYS,
  LOCATION_DEFINITIONS,
  LOCATION_NAME_KEYS,
  NON_SELLABLE_QUANTITY_KEYS,
  PHYSICAL_QUANTITY_KEYS,
  SELLABLE_QUANTITY_KEYS,
} from "@/components/product-detail/utils/stock-availability.constants";
import { asRecord, asString } from "@/components/product-detail/utils/value-utils";

const asStockNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value.trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeStockAmount = (value: number): number =>
  Math.max(0, Math.floor(value));

export const formatLocationAvailabilityAmount = (amount: number): string =>
  amount > HIGH_AVAILABILITY_THRESHOLD
    ? HIGH_AVAILABILITY_LABEL
    : `${normalizeStockAmount(amount)} ks`;

const normalizeLocationName = (value: unknown): string | null => {
  const location = asString(value);
  if (!location) {
    return null;
  }

  return location
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
};

const resolveLocationId = (record: Record<string, unknown>): ProductLocationAvailabilityId | null => {
  for (const key of LOCATION_NAME_KEYS) {
    const normalizedLocation = normalizeLocationName(record[key]);
    if (!normalizedLocation) {
      continue;
    }

    const definition = LOCATION_DEFINITIONS.find((item) =>
      item.aliases.some(
        (alias) => normalizeLocationName(alias) === normalizedLocation,
      ),
    );

    if (definition) {
      return definition.id;
    }
  }

  return null;
};

const firstStockNumber = (record: Record<string, unknown>, keys: string[]): number | null => {
  for (const key of keys) {
    const amount = asStockNumber(record[key]);
    if (amount !== null) {
      return amount;
    }
  }

  return null;
};

const sumStockNumbers = (record: Record<string, unknown>, keys: string[]): number =>
  keys.reduce((total, key) => total + (asStockNumber(record[key]) ?? 0), 0);

const resolveSellableAmount = (record: Record<string, unknown>): number | null => {
  const explicitSellableAmount = firstStockNumber(record, SELLABLE_QUANTITY_KEYS);
  if (explicitSellableAmount !== null) {
    return normalizeStockAmount(explicitSellableAmount);
  }

  const physicalAmount = firstStockNumber(record, PHYSICAL_QUANTITY_KEYS);
  if (physicalAmount === null) {
    return null;
  }

  return normalizeStockAmount(
    physicalAmount - sumStockNumbers(record, NON_SELLABLE_QUANTITY_KEYS),
  );
};

const collectRecordsFromCollection = (collection: unknown): Array<Record<string, unknown>> => {
  if (Array.isArray(collection)) {
    return collection
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => Boolean(item));
  }

  const collectionRecord = asRecord(collection);
  if (!collectionRecord) {
    return [];
  }

  return Object.entries(collectionRecord).map(([location, value]) => {
    const valueRecord = asRecord(value);

    return {
      ...(valueRecord ?? { amount: value }),
      location: valueRecord?.location ?? location,
    };
  });
};

const collectLocationRecords = (source: Record<string, unknown> | null): Array<Record<string, unknown>> => {
  if (!source) {
    return [];
  }

  const stock = asRecord(source.stock);
  const locationRecords: Array<Record<string, unknown>> = [];

  for (const sourceRecord of [source, stock]) {
    if (!sourceRecord) {
      continue;
    }

    for (const key of LOCATION_COLLECTION_KEYS) {
      locationRecords.push(...collectRecordsFromCollection(sourceRecord[key]));
    }
  }

  if (locationRecords.length > 0) {
    return locationRecords;
  }

  return stock ? [stock] : [];
};

export const resolveProductLocationAvailability = (source: Record<string, unknown> | null): ProductLocationAvailability[] => {
  const amountsByLocation = new Map<ProductLocationAvailabilityId, number>();

  for (const record of collectLocationRecords(source)) {
    const locationId = resolveLocationId(record);
    const amount = resolveSellableAmount(record);

    if (!locationId || amount === null) {
      continue;
    }

    amountsByLocation.set(
      locationId,
      (amountsByLocation.get(locationId) ?? 0) + amount,
    );
  }

  return LOCATION_DEFINITIONS.map((definition) => {
    const amount = amountsByLocation.get(definition.id) ?? 0;

    return {
      id: definition.id,
      label: definition.label,
      amount,
      displayLabel: formatLocationAvailabilityAmount(amount),
      isInStock: amount > 0,
    };
  });
};
