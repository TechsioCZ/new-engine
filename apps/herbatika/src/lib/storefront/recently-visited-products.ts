"use client"

import type { HttpTypes } from "@medusajs/types"
import { useEffect, useState } from "react"

const RECENTLY_VISITED_PRODUCTS_STORAGE_KEY =
  "herbatika:recently-visited-products"
const RECENTLY_VISITED_PRODUCTS_EVENT = "herbatika:recently-visited-products"
const RECENTLY_VISITED_PRODUCTS_LIMIT = 12

const isBrowser = () => typeof window !== "undefined"

const readRecentlyVisitedProductHandles = (): string[] => {
  if (!isBrowser()) {
    return []
  }

  try {
    const rawValue = window.localStorage.getItem(
      RECENTLY_VISITED_PRODUCTS_STORAGE_KEY,
    )
    const parsed: unknown =
      rawValue === null || rawValue.length === 0 ? [] : JSON.parse(rawValue)

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed.filter(
      (handle): handle is string =>
        typeof handle === "string" && handle.trim().length > 0,
    )
  } catch {
    return []
  }
}

const writeRecentlyVisitedProductHandles = (handles: string[]) => {
  if (!isBrowser()) {
    return
  }

  try {
    window.localStorage.setItem(
      RECENTLY_VISITED_PRODUCTS_STORAGE_KEY,
      JSON.stringify(handles),
    )
    window.dispatchEvent(
      new CustomEvent(RECENTLY_VISITED_PRODUCTS_EVENT, {
        detail: handles,
      }),
    )
  } catch {
    // Browsers can block storage in strict privacy modes; history is optional.
  }
}

const addRecentlyVisitedProductHandle = (handle: string) => {
  const normalizedHandle = handle.trim()
  if (!normalizedHandle) {
    return
  }

  const handles = readRecentlyVisitedProductHandles()
  const nextHandles = [
    normalizedHandle,
    ...handles.filter((item) => item !== normalizedHandle),
  ].slice(0, RECENTLY_VISITED_PRODUCTS_LIMIT)

  writeRecentlyVisitedProductHandles(nextHandles)
}

export const orderProductsByHandles = (
  products: HttpTypes.StoreProduct[],
  handles: string[],
) => {
  const productByHandle = new Map<string, HttpTypes.StoreProduct>()

  for (const product of products) {
    if (product.handle) {
      productByHandle.set(product.handle, product)
    }
  }

  return handles
    .map((handle) => productByHandle.get(handle))
    .filter((product): product is HttpTypes.StoreProduct => Boolean(product))
}

export const useRecentlyVisitedProductHandles = (options?: {
  excludeHandle?: string | null
}) => {
  const [handles, setHandles] = useState(readRecentlyVisitedProductHandles)

  useEffect(() => {
    const handleRecentlyVisitedProductsEvent = (event: Event) => {
      if (!(event instanceof CustomEvent)) {
        return
      }

      const detail: unknown = event.detail
      if (Array.isArray(detail)) {
        setHandles(
          detail.filter((item): item is string => typeof item === "string"),
        )
      }
    }
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key !== RECENTLY_VISITED_PRODUCTS_STORAGE_KEY) {
        return
      }

      setHandles(readRecentlyVisitedProductHandles())
    }

    window.addEventListener(
      RECENTLY_VISITED_PRODUCTS_EVENT,
      handleRecentlyVisitedProductsEvent,
    )
    window.addEventListener("storage", handleStorageEvent)

    return () => {
      window.removeEventListener(
        RECENTLY_VISITED_PRODUCTS_EVENT,
        handleRecentlyVisitedProductsEvent,
      )
      window.removeEventListener("storage", handleStorageEvent)
    }
  }, [])

  return handles.filter((handle) => handle !== options?.excludeHandle)
}

export const useRecordRecentlyVisitedProduct = (
  product: Pick<HttpTypes.StoreProduct, "handle"> | null,
) => {
  const handle = product?.handle
  useEffect(() => {
    if (handle === null || handle === undefined || handle.length === 0) {
      return
    }

    addRecentlyVisitedProductHandle(handle)
  }, [handle])
}
