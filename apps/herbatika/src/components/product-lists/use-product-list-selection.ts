"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import {
  isFavoriteProductList,
  type StoreProductList,
} from "@/lib/storefront/product-lists"

export function useProductListSelection(sortedLists: StoreProductList[]) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [deleteListId, setDeleteListId] = useState<string | null>(null)

  useEffect(() => {
    if (sortedLists.length === 0) {
      setActiveListId(null)
      return
    }

    const requestedListId = searchParams.get("list")
    const requestedListExists = sortedLists.some(
      (list) => list.id === requestedListId
    )
    const activeListExists = sortedLists.some(
      (list) => list.id === activeListId
    )
    let nextActiveListId = sortedLists[0]?.id ?? null
    if (requestedListId && requestedListExists) {
      nextActiveListId = requestedListId
    } else if (activeListExists && activeListId) {
      nextActiveListId = activeListId
    }

    if (nextActiveListId !== activeListId) {
      setActiveListId(nextActiveListId)
    }
  }, [activeListId, searchParams, sortedLists])

  const selectList = (listId: string) => {
    setActiveListId(listId)
    router.replace(`/account/lists?list=${encodeURIComponent(listId)}`, {
      scroll: false,
    })
  }

  const openDeleteListDialog = (listId: string) => {
    const list = sortedLists.find((candidate) => candidate.id === listId)
    if (list && !isFavoriteProductList(list)) {
      setDeleteListId(listId)
    }
  }

  const handleSelectedListDeleted = (deletedListId: string) => {
    if (activeListId !== deletedListId) {
      return
    }

    const deletedListIndex = sortedLists.findIndex(
      (list) => list.id === deletedListId
    )
    const nextList =
      sortedLists[deletedListIndex - 1] ??
      sortedLists.find((list) => list.id !== deletedListId) ??
      null

    if (nextList?.id) {
      selectList(nextList.id)
      return
    }

    setActiveListId(null)
    router.replace("/account/lists", { scroll: false })
  }

  return {
    activeListId,
    closeDeleteListDialog: () => setDeleteListId(null),
    deleteListId,
    handleSelectedListDeleted,
    openDeleteListDialog,
    selectList,
  }
}
