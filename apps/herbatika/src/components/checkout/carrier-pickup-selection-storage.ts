"use client";

export type StoredCarrierPickupSelection = {
  data: Record<string, unknown>;
  optionId: string;
};

const STORAGE_PREFIX = "herbatika.carrier-pickup";

export function readStoredCarrierPickupSelection({
  cartId,
  optionId,
}: {
  cartId?: string | null;
  optionId?: string | null;
}): StoredCarrierPickupSelection | null {
  if (!cartId || !optionId || typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(createStorageKey(cartId));

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (!isStoredCarrierPickupSelection(parsedValue)) {
      return null;
    }

    return parsedValue.optionId === optionId ? parsedValue : null;
  } catch {
    return null;
  }
}

export function writeStoredCarrierPickupSelection({
  cartId,
  data,
  optionId,
}: {
  cartId?: string | null;
  data?: Record<string, unknown>;
  optionId: string;
}) {
  if (!cartId || typeof window === "undefined") {
    return;
  }

  if (!hasAccessPointId(data)) {
    clearStoredCarrierPickupSelection(cartId);
    return;
  }

  window.sessionStorage.setItem(
    createStorageKey(cartId),
    JSON.stringify({ data, optionId }),
  );
}

export function clearStoredCarrierPickupSelection(cartId?: string | null) {
  if (!cartId || typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(createStorageKey(cartId));
}

function createStorageKey(cartId: string) {
  return `${STORAGE_PREFIX}.${cartId}`;
}

function hasAccessPointId(
  data: Record<string, unknown> | null | undefined,
): data is Record<string, unknown> {
  return typeof data?.access_point_id === "string"
    ? data.access_point_id.trim().length > 0
    : typeof data?.access_point_id === "number" &&
        Number.isFinite(data.access_point_id);
}

function isStoredCarrierPickupSelection(
  value: unknown,
): value is StoredCarrierPickupSelection {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const recordValue = value as Partial<StoredCarrierPickupSelection>;

  return (
    typeof recordValue.optionId === "string" &&
    recordValue.optionId.trim().length > 0 &&
    typeof recordValue.data === "object" &&
    recordValue.data !== null &&
    !Array.isArray(recordValue.data)
  );
}
