"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import {
  PRODUCT_DETAIL_REVIEWS_SECTION_ID,
  PRODUCT_DETAIL_REVIEWS_TAB_VALUE,
} from "@/components/product-detail/sections/product-detail-review-utils"

interface ProductSectionSelection {
  productId: string
  value: string | undefined
}

interface UseProductDetailSectionNavigationInput {
  defaultValue: string
  handle: string
  productId: string | undefined
}

const subscribeToLocationHash = (onStoreChange: () => void) => {
  window.addEventListener("hashchange", onStoreChange)
  window.addEventListener("popstate", onStoreChange)
  return () => {
    window.removeEventListener("hashchange", onStoreChange)
    window.removeEventListener("popstate", onStoreChange)
  }
}

const getLocationHash = () => window.location.hash
const getServerLocationHash = () => ""

export const useProductDetailSectionNavigation = ({
  defaultValue,
  handle,
  productId,
}: UseProductDetailSectionNavigationInput) => {
  const locationHash = useSyncExternalStore(
    subscribeToLocationHash,
    getLocationHash,
    getServerLocationHash,
  )
  const [selection, setSelection] = useState<ProductSectionSelection | null>(
    null,
  )

  useEffect(() => {
    if (window.location.hash === "") {
      window.scrollTo({ behavior: "auto", left: 0, top: 0 })
    }
  }, [handle])

  let activeSectionValue: string | undefined = defaultValue
  if (locationHash === `#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`) {
    activeSectionValue = PRODUCT_DETAIL_REVIEWS_TAB_VALUE
  }
  if (selection !== null && selection.productId === productId) {
    activeSectionValue = selection.value
  }

  const handleSectionValueChange = (value: string | undefined) => {
    if (productId !== undefined) {
      setSelection({ productId, value })
    }
  }

  const handleShowAllReviews = () => {
    handleSectionValueChange(PRODUCT_DETAIL_REVIEWS_TAB_VALUE)
    window.history.replaceState(
      null,
      "",
      `#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`,
    )
    window.requestAnimationFrame(() => {
      document
        .querySelector(`#${PRODUCT_DETAIL_REVIEWS_SECTION_ID}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return {
    activeSectionValue,
    handleSectionValueChange,
    handleShowAllReviews,
  }
}
