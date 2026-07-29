import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import {
  Button,
  Container,
  createDataTableColumnHelper,
  DataTable,
  Drawer,
  Heading,
  Input,
  Label,
  Select,
  Text,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  listAllProductAttributeOptions,
  listProductAttributeOptions,
  type ProductAttributeDetailItem,
  type ProductAttributeOption,
  productAttributeQueryKeys,
  retrieveProductAttributes,
  type SetProductAttributeOperation,
  setProductAttributes,
} from "../lib/product-attributes"
import { getPaginationTranslations } from "../lib/table"
import { useDebouncedValue } from "../lib/use-debounced-value"

type ProductAttributesWidgetProps = Partial<DetailWidgetProps<AdminProduct>>
type AttributeValues = Record<string, string>

const SUPPLIER_KEY = "supplier"
const WARRANTY_KEY = "warranty"
const PAGE_SIZE = 10
const optionColumnHelper = createDataTableColumnHelper<ProductAttributeOption>()

const getInitialValues = (
  items: ProductAttributeDetailItem[]
): AttributeValues =>
  Object.fromEntries(
    items.map((item) => [
      item.definition.id,
      item.assignment?.option_id ?? item.assignment?.text_value ?? "",
    ])
  )

const SupplierSelector = ({
  definitionId,
  disabled,
  onSelect,
  selectedId,
}: {
  definitionId: string
  disabled: boolean
  onSelect: (optionId: string) => void
  selectedId: string
}) => {
  const { t } = useTranslation("productAttributes")
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q)
  const params = {
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
    order: "label",
    q: debouncedQ,
    status: "active" as const,
  }
  const { data, isLoading } = useQuery({
    queryFn: () => listProductAttributeOptions(definitionId, params),
    queryKey: productAttributeQueryKeys.options(definitionId, params),
  })
  const columns = useMemo(
    () => [
      optionColumnHelper.accessor("label", {
        header: t("columns.label"),
      }),
      optionColumnHelper.display({
        id: "selection",
        cell: ({ row }) =>
          row.original.id === selectedId ? (
            <Text size="small" weight="plus">
              {t("status.active")}
            </Text>
          ) : (
            <Button
              disabled={disabled}
              onClick={() => onSelect(row.original.id)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.select")}
            </Button>
          ),
      }),
    ],
    [disabled, onSelect, selectedId, t]
  )
  const table = useDataTable({
    columns,
    data: data?.options ?? [],
    getRowId: (option) => option.id,
    isLoading,
    pagination: {
      onPaginationChange: (next) => setPageIndex(next.pageIndex),
      state: { pageIndex, pageSize: PAGE_SIZE },
    },
    rowCount: data?.count ?? 0,
    search: {
      onSearchChange: (value) => {
        setPageIndex(0)
        setQ(value)
      },
      state: q,
    },
  })

  return (
    <DataTable instance={table}>
      <DataTable.Toolbar>
        <DataTable.Search placeholder={t("widget.supplierSearch")} />
      </DataTable.Toolbar>
      <DataTable.Table />
      <DataTable.Pagination translations={getPaginationTranslations(t)} />
    </DataTable>
  )
}

const AttributeSelect = ({
  definitionId,
  disabled,
  onValueChange,
  value,
}: {
  definitionId: string
  disabled: boolean
  onValueChange: (value: string) => void
  value: string
}) => {
  const { t } = useTranslation("productAttributes")
  const query = useQuery({
    queryFn: () => listAllProductAttributeOptions(definitionId),
    queryKey: [
      ...productAttributeQueryKeys.optionLists(definitionId),
      "all-active",
    ],
  })

  if (query.error) {
    return (
      <Text className="text-ui-fg-error" size="small">
        {t("errors.loadFailed")}
      </Text>
    )
  }

  return (
    <Select
      disabled={disabled || query.isLoading}
      onValueChange={(nextValue) =>
        onValueChange(nextValue === "__none__" ? "" : nextValue)
      }
      value={value || "__none__"}
    >
      <Select.Trigger>
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="__none__">-</Select.Item>
        {(query.data ?? []).map((option) => (
          <Select.Item key={option.id} value={option.id}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
}

const ProductAttributesDrawer = ({
  items,
  onOpenChange,
  open,
  productId,
}: {
  items: ProductAttributeDetailItem[]
  onOpenChange: (open: boolean) => void
  open: boolean
  productId: string
}) => {
  const { t } = useTranslation("productAttributes")
  const queryClient = useQueryClient()
  const [values, setValues] = useState<AttributeValues>(() =>
    getInitialValues(items)
  )

  useEffect(() => {
    if (open) {
      setValues(getInitialValues(items))
    }
  }, [items, open])

  const mutation = useMutation({
    mutationFn: (operations: SetProductAttributeOperation[]) =>
      setProductAttributes(productId, operations),
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : t("errors.saveFailed")
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: productAttributeQueryKeys.product(productId),
        }),
        queryClient.invalidateQueries({
          queryKey: ["product", productId],
        }),
      ])
      toast.success(t("toasts.saved"))
      onOpenChange(false)
    },
  })
  const updateValue = (definitionId: string, value: string) =>
    setValues((current) => ({ ...current, [definitionId]: value }))
  const save = () => {
    const operations = items.map<SetProductAttributeOperation>((item) => {
      const value = values[item.definition.id]?.trim() ?? ""
      if (!value) {
        return {
          action: "remove",
          definition_id: item.definition.id,
        }
      }
      return item.definition.input_type === "text"
        ? {
            action: "set",
            definition_id: item.definition.id,
            text_value: value,
          }
        : {
            action: "set",
            definition_id: item.definition.id,
            option_id: value,
          }
    })
    mutation.mutate(operations)
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("widget.manageTitle")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-5 overflow-y-auto">
          {items.map((item) => {
            const value = values[item.definition.id] ?? ""
            return (
              <div className="flex flex-col gap-2" key={item.definition.id}>
                <Label>{item.definition.label}</Label>
                {item.definition.input_type === "text" ? (
                  <Input
                    disabled={mutation.isPending}
                    onChange={(event) =>
                      updateValue(item.definition.id, event.target.value)
                    }
                    placeholder={t("placeholders.textValue")}
                    value={value}
                  />
                ) : null}
                {item.definition.input_type === "select" &&
                item.definition.key === SUPPLIER_KEY ? (
                  <>
                    <Button
                      disabled={!value || mutation.isPending}
                      onClick={() => updateValue(item.definition.id, "")}
                      size="small"
                      type="button"
                      variant="secondary"
                    >
                      {t("actions.delete")}
                    </Button>
                    <SupplierSelector
                      definitionId={item.definition.id}
                      disabled={mutation.isPending}
                      onSelect={(optionId) =>
                        updateValue(item.definition.id, optionId)
                      }
                      selectedId={value}
                    />
                  </>
                ) : null}
                {item.definition.input_type === "select" &&
                item.definition.key !== SUPPLIER_KEY ? (
                  <AttributeSelect
                    definitionId={item.definition.id}
                    disabled={mutation.isPending}
                    onValueChange={(nextValue) =>
                      updateValue(item.definition.id, nextValue)
                    }
                    value={value}
                  />
                ) : null}
                {item.definition.key === WARRANTY_KEY ? (
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("types.select")}
                  </Text>
                ) : null}
              </div>
            )
          })}
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            disabled={mutation.isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="secondary"
          >
            {t("actions.cancel")}
          </Button>
          <Button isLoading={mutation.isPending} onClick={save} type="button">
            {t("actions.save")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const ProductAttributesWidget = ({
  data: product,
}: ProductAttributesWidgetProps) => {
  const { t } = useTranslation("productAttributes")
  const [open, setOpen] = useState(false)
  const query = useQuery({
    enabled: Boolean(product?.id),
    queryFn: () => retrieveProductAttributes(product?.id ?? ""),
    queryKey: productAttributeQueryKeys.product(product?.id),
  })

  if (!product?.id) {
    return null
  }

  const items = query.data?.product_attributes ?? []
  const editableItems = items.filter((item) => !item.definition.deleted_at)
  const displayItems = items.filter(
    (item) => item.definition.key !== SUPPLIER_KEY
  )

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">{t("widget.title")}</Heading>
          <Button
            onClick={() => setOpen(true)}
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.edit")}
          </Button>
        </div>
        <div className="flex flex-col gap-3 px-6 py-4">
          {query.isLoading ? (
            <Text size="small">{t("status.loading")}</Text>
          ) : null}
          {query.error ? (
            <Text className="text-ui-fg-error" size="small">
              {t("widget.loadFailed")}
            </Text>
          ) : null}
          {query.isLoading || query.error || displayItems.length ? null : (
            <Text className="text-ui-fg-subtle" size="small">
              {t("widget.empty")}
            </Text>
          )}
          {displayItems.map((item) => {
            const displayValue =
              item.selected_option?.label ?? item.assignment?.text_value
            return (
              <div
                className="flex items-center justify-between gap-3"
                key={item.definition.id}
              >
                <Text size="small" weight="plus">
                  {item.definition.label}
                </Text>
                <Text className="text-ui-fg-subtle" size="small">
                  {displayValue ?? "-"}
                </Text>
              </div>
            )
          })}
        </div>
      </Container>
      {open ? (
        <ProductAttributesDrawer
          items={editableItems}
          onOpenChange={setOpen}
          open={open}
          productId={product.id}
        />
      ) : null}
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductAttributesWidget
