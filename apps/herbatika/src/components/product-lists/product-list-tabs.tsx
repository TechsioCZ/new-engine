"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { Tabs } from "@techsio/ui-kit/molecules/tabs"
import { useTranslations } from "next-intl"
import { Fragment } from "react"

import {
  getProductListItemCount,
  getProductListTitle,
  isFavoriteProductList,
} from "@/lib/storefront/product-lists"

import { ProductListActiveContent } from "./product-list-active-content"
import type { AccountProductListsController } from "./use-account-product-lists"

interface ProductListTabsProps {
  accountLists: AccountProductListsController
}

export const ProductListTabs = ({ accountLists }: ProductListTabsProps) => {
  const tAuth = useTranslations("auth")
  const titleLabels = {
    favorite: tAuth("product_lists.favorite_title"),
    untitled: tAuth("product_lists.untitled_list"),
  }
  const handleOpenCreateListDialog = accountLists.openCreateListDialog

  return (
    <Tabs
      onValueChange={(listId: string) => {
        accountLists.selectList(listId)
      }}
      size="sm"
      value={accountLists.activeListId ?? accountLists.sortedLists[0]?.id}
      variant="line"
    >
      <div className="flex items-center gap-100 overflow-x-auto">
        <Tabs.List className="min-w-max border-product-list-tabs-border bg-base">
          {accountLists.sortedLists.map((list) => {
            const listTitle = getProductListTitle(list, titleLabels)
            const canDeleteList = !isFavoriteProductList(list)

            return (
              <Fragment key={list.id}>
                <Tabs.Trigger className="px-200 py-200" value={list.id}>
                  {`${listTitle} (${getProductListItemCount(list)})`}
                </Tabs.Trigger>
                {canDeleteList ? (
                  <Button
                    aria-label={tAuth("product_lists.delete_list_aria", {
                      listTitle,
                    })}
                    disabled={accountLists.deleteListMutation.isPending}
                    icon="token-icon-close"
                    onClick={() => {
                      accountLists.openDeleteListDialog(list.id)
                    }}
                    size="sm"
                    theme="borderless"
                    type="button"
                    variant="danger"
                  />
                ) : null}
              </Fragment>
            )
          })}
          <Tabs.Indicator />
        </Tabs.List>
        <Button
          aria-label={tAuth("product_lists.create_list_aria")}
          disabled={accountLists.createListMutation.isPending}
          icon="token-icon-plus"
          onClick={handleOpenCreateListDialog}
          size="sm"
          theme="borderless"
          type="button"
          variant="secondary"
        />
      </div>

      {accountLists.sortedLists.map((list) => (
        <Tabs.Content key={list.id} value={list.id}>
          {list.id === accountLists.activeListId ? (
            <div className="space-y-400">
              <ProductListActiveContent accountLists={accountLists} />
            </div>
          ) : null}
        </Tabs.Content>
      ))}
    </Tabs>
  )
}
