"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { useState } from "react"
import type { Dispatch, SetStateAction, SubmitEvent } from "react"

import { useAppToast } from "@/hooks/use-app-toast"
import { resolveErrorMessage } from "@/lib/storefront/error-utils"
import {
  isFavoriteProductList,
  useCreateCustomProductList,
  useDeleteProductList,
} from "@/lib/storefront/product-lists"
import type { StoreProductList } from "@/lib/storefront/product-lists"

import { resolveDeleteList } from "./account-product-list-controller.utils"

interface UseAccountProductListDialogsInput {
  activeListId: string | null
  setSelectedListId: Dispatch<SetStateAction<string | null>>
  sortedLists: StoreProductList[]
}

export const useAccountProductListDialogs = ({
  activeListId,
  setSelectedListId,
  sortedLists,
}: UseAccountProductListDialogsInput) => {
  const tAuth = useTranslations("auth")
  const router = useRouter()
  const toast = useAppToast()
  const [showCreateListDialog, setShowCreateListDialog] = useState(false)
  const [newListTitle, setNewListTitle] = useState("")
  const [deleteListId, setDeleteListId] = useState<string | null>(null)
  const createListMutation = useCreateCustomProductList()
  const deleteListMutation = useDeleteProductList()
  const deleteList = resolveDeleteList(sortedLists, deleteListId)

  const selectList = (listId: string) => {
    setSelectedListId(listId)
    router.replace(`/account/lists?list=${encodeURIComponent(listId)}`, {
      scroll: false,
    })
  }
  const openCreateListDialog = () => {
    setShowCreateListDialog(true)
  }
  const closeCreateListDialog = () => {
    setShowCreateListDialog(false)
    setNewListTitle("")
  }
  const openDeleteListDialog = (listId: string) => {
    const list = sortedLists.find((candidate) => candidate.id === listId)
    if (list === undefined || isFavoriteProductList(list)) {
      return
    }
    setDeleteListId(listId)
  }
  const closeDeleteListDialog = () => {
    setDeleteListId(null)
  }

  const handleCreateList = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const title = newListTitle.trim()
    if (title === "") {
      toast.warning({
        title: tAuth("product_lists.validation.title_required"),
      })
      return
    }

    try {
      const createdList = await createListMutation.mutateAsync({
        access_type: "private",
        title,
      })
      if (createdList?.id !== undefined && createdList.id !== "") {
        selectList(createdList.id)
      }
      setNewListTitle("")
      setShowCreateListDialog(false)
    } catch (error) {
      toast.error({
        title: resolveErrorMessage(
          error,
          tAuth("product_lists.errors.create_failed"),
        ),
      })
    }
  }

  const handleDeleteList = async () => {
    if (deleteList?.id === undefined || deleteList.id === "") {
      return
    }
    const deletedListId = deleteList.id
    const deletedListIndex = sortedLists.findIndex(
      (list) => list.id === deletedListId,
    )
    const nextList =
      sortedLists[deletedListIndex - 1] ??
      sortedLists.find((list) => list.id !== deletedListId) ??
      null

    try {
      await deleteListMutation.mutateAsync({ listId: deletedListId })
      if (activeListId === deletedListId) {
        if (nextList?.id !== undefined && nextList.id !== "") {
          selectList(nextList.id)
        } else {
          setSelectedListId(null)
          router.replace("/account/lists", { scroll: false })
        }
      }
      setDeleteListId(null)
    } catch (error) {
      toast.error({
        title: resolveErrorMessage(
          error,
          tAuth("product_lists.errors.delete_list_failed"),
        ),
      })
    }
  }

  return {
    closeCreateListDialog,
    closeDeleteListDialog,
    createListMutation,
    deleteList,
    deleteListMutation,
    handleCreateList,
    handleDeleteList,
    newListTitle,
    openCreateListDialog,
    openDeleteListDialog,
    selectList,
    setNewListTitle,
    showCreateListDialog,
  }
}
