"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import NextLink from "next/link"
import { AccountSurface } from "@/components/account/account-surface"
import { AddListDialog } from "@/components/product-lists/add-list-dialog"
import { ProductListTabs } from "@/components/product-lists/product-list-tabs"
import { RemoveListDialog } from "@/components/product-lists/remove-list-dialog"
import { useAccountProductLists } from "@/components/product-lists/use-account-product-lists"

function ProductListsEmptyState({
  onCreateList,
}: {
  onCreateList: () => void
}) {
  return (
    <div className="space-y-300 rounded-md border border-border-secondary p-400">
      <p className="text-fg-secondary text-sm">
        Zatiaľ nemáte žiadny zoznam produktov.
      </p>
      <div className="flex flex-wrap items-center gap-200">
        <Button
          icon="token-icon-plus"
          onClick={onCreateList}
          size="sm"
          type="button"
          variant="secondary"
        >
          Nový zoznam
        </Button>
        <LinkButton as={NextLink} href="/" size="sm" variant="secondary">
          Prejsť na produkty
        </LinkButton>
      </div>
    </div>
  )
}

export function AccountProductLists() {
  const accountLists = useAccountProductLists()

  if (accountLists.listsQuery.isLoading) {
    return (
      <AccountSurface>
        <Skeleton>
          <Skeleton.Text noOfLines={6} />
        </Skeleton>
      </AccountSurface>
    )
  }

  if (accountLists.listsQuery.error) {
    return (
      <AccountSurface className="space-y-400">
        <Button
          onClick={() => void accountLists.listsQuery.query.refetch()}
          variant="secondary"
        >
          Skúsiť znova
        </Button>
      </AccountSurface>
    )
  }

  return (
    <AccountSurface className="space-y-500">
      <header className="flex flex-col gap-300 md:flex-row md:items-end md:justify-between">
        <div className="space-y-150">
          <h2 className="font-semibold text-xl">Zoznamy produktov</h2>
          <p className="text-fg-secondary text-sm">
            Uložené produkty a vlastné nákupné zoznamy.
          </p>
        </div>
      </header>

      <AddListDialog accountLists={accountLists} />
      <RemoveListDialog accountLists={accountLists} />

      {accountLists.sortedLists.length === 0 ? (
        <ProductListsEmptyState
          onCreateList={accountLists.openCreateListDialog}
        />
      ) : (
        <ProductListTabs accountLists={accountLists} />
      )}
    </AccountSurface>
  )
}
