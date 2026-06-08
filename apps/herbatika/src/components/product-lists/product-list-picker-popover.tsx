"use client";

import { Button } from "@techsio/ui-kit/atoms/button";
import { Checkbox } from "@techsio/ui-kit/atoms/checkbox";
import { Input } from "@techsio/ui-kit/atoms/input";
import { LinkButton } from "@techsio/ui-kit/atoms/link-button";
import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import { Popover } from "@techsio/ui-kit/molecules/popover";
import NextLink from "next/link";
import type { Product } from "@/components/product-detail/product-detail.types";
import {
  type ProductListPickerRow,
  useProductListPicker,
} from "./use-product-list-picker";

type ProductListPickerPopoverProps = {
  product: Product;
  quantity: number;
  selectedVariantId: string | null;
};

type ProductListPickerListRowProps = {
  isMutating: boolean;
  isPending: boolean;
  onAdd: (row: ProductListPickerRow) => void;
  row: ProductListPickerRow;
};

function ProductListPickerListRow({
  isMutating,
  isPending,
  onAdd,
  row,
}: ProductListPickerListRowProps) {
  return (
    <div className="flex items-center gap-200 px-350 py-250">
      <Checkbox
        aria-label={
          row.checked
            ? `${row.title} už obsahuje produkt`
            : `Pridať do zoznamu ${row.title}`
        }
        checked={row.checked}
        disabled={isMutating}
        onChange={() => {
          if (!row.checked) {
            onAdd(row);
          }
        }}
      />
      <span className="min-w-0 flex-1 truncate text-sm">{row.title}</span>
      <span className="text-fg-tertiary text-xs">{row.count}</span>
      {row.list?.id ? (
        <LinkButton
          aria-label={`Otvoriť zoznam ${row.title}`}
          as={NextLink}
          className="h-500 w-500 p-0"
          href={`/account/lists?list=${encodeURIComponent(row.list.id)}`}
          icon="token-icon-chevron-right"
          iconSize="sm"
          size="current"
          theme="unstyled"
          variant="secondary"
        />
      ) : (
        <span className="h-500 w-500" />
      )}
      {isPending ? <span className="sr-only">Pridávam produkt</span> : null}
    </div>
  );
}

export function ProductListPickerPopover({
  product,
  quantity,
  selectedVariantId,
}: ProductListPickerPopoverProps) {
  const picker = useProductListPicker({
    product,
    quantity,
    selectedVariantId,
  });

  return (
    <Popover.Root
      border
      gutter={10}
      id="product-list-picker"
      onOpenChange={({ open }) => picker.setIsOpen(open)}
      open={picker.isOpen}
      portalled={false}
      size="sm"
    >
      <Popover.Trigger
        aria-label="Pridať do zoznamu"
        className="h-750 min-h-750 w-750 min-w-750 p-0 text-fg-secondary hover:text-fg-primary sm:h-600 sm:min-h-600 sm:w-600 sm:min-w-600 hover:text-primary hover:bg-transparent"
        icon="token-icon-heart"
        iconSize="2xl"
        size="sm"
        theme="borderless"
        variant="secondary"
      />

      <Popover.Positioner>
        <Popover.Content className="w-950 max-w-full p-0">
          <Popover.Arrow />
          <div className="border-border-secondary border-b px-350 py-300">
            <Popover.Title className="mb-0 text-sm">
              Vyberte zoznam
            </Popover.Title>
          </div>

          {!picker.authQuery.isAuthenticated ? (
            <div className="space-y-300 px-350 py-350">
              <p className="text-fg-secondary text-sm">
                Na ukladanie produktov do zoznamov sa prosím prihláste.
              </p>
              <LinkButton
                as={NextLink}
                block
                href={picker.loginHref}
                size="sm"
                variant="primary"
              >
                Prihlásiť sa
              </LinkButton>
            </div>
          ) : picker.listsQuery.isLoading || picker.detailsAreLoading ? (
            <div className="space-y-250 px-350 py-350">
              <Skeleton>
                <Skeleton.Text noOfLines={3} />
              </Skeleton>
            </div>
          ) : (
            <>
              <div className="divide-y divide-border-secondary">
                {picker.rows.map((row) => (
                  <ProductListPickerListRow
                    isMutating={picker.isMutating}
                    isPending={
                      picker.isMutating && picker.activeListKey === row.key
                    }
                    key={row.key}
                    onAdd={(nextRow) => void picker.addProductToList(nextRow)}
                    row={row}
                  />
                ))}
              </div>

              <div className="border-border-secondary border-t px-350 py-250">
                {picker.showNewListInput ? (
                  <form
                    className="flex items-center gap-200"
                    onSubmit={picker.handleCreateList}
                  >
                    <label
                      className="sr-only"
                      htmlFor="product-list-picker-new-list-title"
                    >
                      Názov nového zoznamu
                    </label>
                    <Input
                      aria-label="Názov nového zoznamu"
                      autoFocus
                      disabled={picker.isMutating}
                      id="product-list-picker-new-list-title"
                      name="product-list-title"
                      onChange={(event) => {
                        picker.setNewListTitle(event.target.value);
                      }}
                      placeholder="Názov zoznamu"
                      size="sm"
                      value={picker.newListTitle}
                    />
                    <Button
                      disabled={picker.isMutating}
                      isLoading={picker.activeListKey === "new-list"}
                      size="sm"
                      theme="borderless"
                      type="submit"
                      variant="primary"
                    >
                      OK
                    </Button>
                  </form>
                ) : (
                  <Button
                    disabled={picker.isMutating}
                    icon="token-icon-plus"
                    onClick={() => {
                      picker.setShowNewListInput(true);
                    }}
                    size="sm"
                    iconSize="md"
                    theme="borderless"
                    variant="primary"
                  >
                    Nový zoznam
                  </Button>
                )}
              </div>
            </>
          )}
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  );
}
