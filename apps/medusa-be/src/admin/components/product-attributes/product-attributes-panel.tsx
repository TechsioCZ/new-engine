import { TriangleRightMini } from "@medusajs/icons"
import {
  Button,
  Container,
  createDataTableColumnHelper,
  DataTable,
  Drawer,
  IconButton,
  Input,
  Label,
  StatusBadge,
  Text,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  listProductAttributeOptions,
  type ProductAttributeDetailItem,
  type ProductAttributeOption,
  productAttributeQueryKeys,
  type SetProductAttributeOperation,
  setProductAttributes,
} from "../../lib/product-attributes"
import { getPaginationTranslations } from "../../lib/table"
import { useDebouncedValue } from "../../lib/use-debounced-value"

type AttributeValues = Record<string, string>
type AttributeOptionLabels = Record<string, string>

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

const getInitialOptionLabels = (
  items: ProductAttributeDetailItem[]
): AttributeOptionLabels =>
  Object.fromEntries(
    items.map((item) => [item.definition.id, item.selected_option?.label ?? ""])
  )

const AttributeOptionSelector = ({
  definitionId,
  disabled,
  label,
  onSelect,
  selectedId,
}: {
  definitionId: string
  disabled: boolean
  label: string
  onSelect: (option: ProductAttributeOption) => void
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
              {t("status.selected")}
            </Text>
          ) : (
            <Button
              disabled={disabled}
              onClick={() => onSelect(row.original)}
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
    <div className="min-h-[22rem]">
      <DataTable instance={table}>
        <DataTable.Toolbar>
          <div className="w-full">
            <DataTable.Search
              className="w-full"
              placeholder={t("widget.optionSearch", { label })}
            />
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination translations={getPaginationTranslations(t)} />
      </DataTable>
    </div>
  )
}

const AttributeEditorCard = ({
  disabled,
  isOpen,
  item,
  onClear,
  onOptionSelect,
  onTextChange,
  onToggle,
  value,
  valueLabel,
}: {
  disabled: boolean
  isOpen: boolean
  item: ProductAttributeDetailItem
  onClear: () => void
  onOptionSelect: (option: ProductAttributeOption) => void
  onTextChange: (value: string) => void
  onToggle: () => void
  value: string
  valueLabel: string
}) => {
  const { t } = useTranslation("productAttributes")
  const contentId = `product-attribute-content-${item.definition.id}`
  const inputId = `product-attribute-${item.definition.id}`

  return (
    <Container className="overflow-hidden p-0">
      <div className="flex items-center gap-3 px-4 py-3">
        <IconButton
          aria-controls={contentId}
          aria-expanded={isOpen}
          aria-label={t(isOpen ? "actions.collapse" : "actions.expand")}
          disabled={disabled}
          onClick={onToggle}
          size="2xsmall"
          type="button"
          variant="transparent"
        >
          <TriangleRightMini
            className={`text-ui-fg-muted transition-transform ${
              isOpen ? "rotate-90" : ""
            }`}
          />
        </IconButton>
        <div className="min-w-0 flex-1">
          <Text leading="compact" size="small" weight="plus">
            {item.definition.label}
          </Text>
          <Text
            className="truncate text-ui-fg-subtle"
            leading="compact"
            size="small"
            title={valueLabel || undefined}
          >
            {valueLabel || "-"}
          </Text>
        </div>
        <Button
          disabled={!value || disabled}
          onClick={onClear}
          size="small"
          type="button"
          variant="secondary"
        >
          {t("actions.clear")}
        </Button>
      </div>
      {isOpen ? (
        <div
          className="border-ui-border-base border-t px-4 py-4"
          id={contentId}
        >
          {item.definition.input_type === "text" ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor={inputId}>{item.definition.label}</Label>
              <Input
                disabled={disabled}
                id={inputId}
                onChange={(event) => onTextChange(event.target.value)}
                placeholder={t("placeholders.textValue")}
                value={value}
              />
            </div>
          ) : null}
          {item.definition.input_type === "select" ? (
            <AttributeOptionSelector
              definitionId={item.definition.id}
              disabled={disabled}
              label={item.definition.label}
              onSelect={onOptionSelect}
              selectedId={value}
            />
          ) : null}
        </div>
      ) : null}
    </Container>
  )
}

export const ProductAttributesDrawer = ({
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
  const [optionLabels, setOptionLabels] = useState<AttributeOptionLabels>(() =>
    getInitialOptionLabels(items)
  )
  const [openDefinitionIds, setOpenDefinitionIds] = useState<Set<string>>(
    () => new Set()
  )

  useEffect(() => {
    if (open) {
      setValues(getInitialValues(items))
      setOptionLabels(getInitialOptionLabels(items))
      setOpenDefinitionIds(new Set())
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
  const updateOptionLabel = (definitionId: string, value: string) =>
    setOptionLabels((current) => ({ ...current, [definitionId]: value }))
  const toggleDefinition = (definitionId: string) =>
    setOpenDefinitionIds((current) => {
      const next = new Set(current)
      if (next.has(definitionId)) {
        next.delete(definitionId)
      } else {
        next.add(definitionId)
      }
      return next
    })
  const handleOpenChange = (nextOpen: boolean) => {
    if (!mutation.isPending) {
      onOpenChange(nextOpen)
    }
  }
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
    <Drawer onOpenChange={handleOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("widget.manageTitle")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
          {items.length ? null : (
            <Text className="text-ui-fg-subtle" size="small">
              {t("widget.empty")}
            </Text>
          )}
          {items.map((item) => {
            const value = values[item.definition.id] ?? ""
            const isOpen = openDefinitionIds.has(item.definition.id)
            const valueLabel =
              item.definition.input_type === "text"
                ? value.trim()
                : optionLabels[item.definition.id]?.trim()
            return (
              <AttributeEditorCard
                disabled={mutation.isPending}
                isOpen={isOpen}
                item={item}
                key={item.definition.id}
                onClear={() => {
                  updateValue(item.definition.id, "")
                  updateOptionLabel(item.definition.id, "")
                }}
                onOptionSelect={(option) => {
                  updateValue(item.definition.id, option.id)
                  updateOptionLabel(item.definition.id, option.label)
                }}
                onTextChange={(nextValue) =>
                  updateValue(item.definition.id, nextValue)
                }
                onToggle={() => toggleDefinition(item.definition.id)}
                value={value}
                valueLabel={valueLabel ?? ""}
              />
            )
          })}
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            disabled={mutation.isPending}
            onClick={() => handleOpenChange(false)}
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.cancel")}
          </Button>
          <Button
            isLoading={mutation.isPending}
            onClick={save}
            size="small"
            type="button"
          >
            {t("actions.save")}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

export const ProductAttributesContent = ({
  error,
  isLoading,
  items,
}: {
  error: unknown
  isLoading: boolean
  items: ProductAttributeDetailItem[]
}) => {
  const { t } = useTranslation("productAttributes")
  const visibleItems = items.filter(
    (item) => !item.definition.deleted_at || item.assignment
  )

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? <Text size="small">{t("status.loading")}</Text> : null}
      {error ? (
        <Text className="text-ui-fg-error" size="small">
          {t("widget.loadFailed")}
        </Text>
      ) : null}
      {isLoading || error || visibleItems.length ? null : (
        <Text className="text-ui-fg-subtle" size="small">
          {t("widget.empty")}
        </Text>
      )}
      {visibleItems.map((item) => {
        const displayValue =
          item.selected_option?.label ?? item.assignment?.text_value
        const isDeleted = Boolean(
          item.definition.deleted_at || item.selected_option?.deleted_at
        )
        return (
          <div
            className="flex items-center justify-between gap-3"
            key={item.definition.id}
          >
            <div className="flex min-w-0 items-center gap-2">
              <Text size="small" weight="plus">
                {item.definition.label}
              </Text>
              {isDeleted ? (
                <StatusBadge color="red">{t("status.deleted")}</StatusBadge>
              ) : null}
            </div>
            <Text className="text-ui-fg-subtle" size="small">
              {displayValue ?? "-"}
            </Text>
          </div>
        )
      })}
    </div>
  )
}
