import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Label,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  createMeasurementUnit,
  deleteProductMeasurement,
  listMeasurementUnits,
  type MeasurementUnit,
  measurementUnitQueryKeys,
  type ProductMeasurement,
  retrieveProductMeasurement,
  setProductMeasurement,
} from "../lib/measurement-units"
import { getPaginationTranslations } from "../lib/table"
import { useDebouncedValue } from "../lib/use-debounced-value"

type ProductMeasurementWidgetProps = Partial<DetailWidgetProps<AdminProduct>>

const PAGE_SIZE = 20

const toUnitCode = (value: string) => {
  const code = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")

  return code || "unit"
}

const MeasurementSelectionRows = ({
  currentUnitId,
  isLoading,
  onSelect,
  units,
}: {
  currentUnitId?: string
  isLoading: boolean
  onSelect: (unitId: string) => void
  units: MeasurementUnit[]
}) => {
  const { t } = useTranslation("measurementUnits")

  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>{t("status.loading")}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  if (!units.length) {
    return (
      <Table.Row>
        <Table.Cell>{t("units.empty")}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return units.map((unit) => {
    const isSelected = unit.id === currentUnitId

    return (
      <Table.Row
        className={isSelected ? undefined : "cursor-pointer"}
        key={unit.id}
        onClick={() => {
          if (!isSelected) {
            onSelect(unit.id)
          }
        }}
      >
        <Table.Cell>{unit.name}</Table.Cell>
        <Table.Cell className="text-ui-fg-subtle">{unit.code}</Table.Cell>
        <Table.Cell>{unit.symbol}</Table.Cell>
        <Table.Cell>
          <div className="flex justify-end">
            {isSelected ? (
              <Badge size="2xsmall">{t("status.selected")}</Badge>
            ) : (
              <Button
                onClick={(event) => {
                  event.stopPropagation()
                  onSelect(unit.id)
                }}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.select")}
              </Button>
            )}
          </div>
        </Table.Cell>
      </Table.Row>
    )
  })
}

const ProductMeasurementContent = ({
  error,
  isLoading,
  measurement,
}: {
  error: unknown
  isLoading: boolean
  measurement?: ProductMeasurement | null
}) => {
  const { t } = useTranslation("measurementUnits")

  if (error) {
    return (
      <Text className="text-ui-fg-error" size="small">
        {t("widget.loadFailed")}
      </Text>
    )
  }

  if (isLoading) {
    return <Text size="small">{t("status.loading")}</Text>
  }

  if (!measurement) {
    return (
      <Text className="text-ui-fg-subtle" size="small">
        {t("widget.empty")}
      </Text>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <Text size="small" weight="plus">
          {measurement.unit.name}
        </Text>
        <Text className="text-ui-fg-subtle" size="small">
          {measurement.product_unit_quantity} {measurement.unit.symbol}
        </Text>
      </div>
      <Badge size="2xsmall">{measurement.unit.code}</Badge>
    </div>
  )
}

const ProductMeasurementDrawer = ({
  currentMeasurement,
  onOpenChange,
  open,
  productId,
}: {
  currentMeasurement?: ProductMeasurement | null
  onOpenChange: (open: boolean) => void
  open: boolean
  productId: string
}) => {
  const { t } = useTranslation("measurementUnits")
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q)
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => currentMeasurement?.unit.id
  )
  const [quantity, setQuantity] = useState(
    () => currentMeasurement?.product_unit_quantity.toString() ?? ""
  )

  useEffect(() => {
    if (open) {
      setPageIndex(0)
      setQ("")
      setSelectedId(currentMeasurement?.unit.id)
      setQuantity(currentMeasurement?.product_unit_quantity.toString() ?? "")
    }
  }, [currentMeasurement, open])

  const params = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: "name",
      q: debouncedQ,
    }),
    [debouncedQ, pageIndex]
  )

  const { data, isLoading } = useQuery({
    enabled: open,
    queryFn: () => listMeasurementUnits(params),
    queryKey: measurementUnitQueryKeys.list(params),
  })

  const units = data?.measurement_units ?? []
  const selectedUnit =
    units.find((unit) => unit.id === selectedId) ??
    (currentMeasurement && currentMeasurement.unit.id === selectedId
      ? currentMeasurement.unit
      : undefined)
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)
  const quantityNumber = Number(quantity)

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) {
        return deleteProductMeasurement(productId)
      }

      return setProductMeasurement(productId, {
        measurement_unit_id: selectedId,
        product_unit_quantity: quantityNumber,
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.productMeasurement(productId),
      })
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({ queryKey: ["product", productId] })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(
        selectedId
          ? t("toasts.productMeasurementUpdated")
          : t("toasts.productMeasurementCleared")
      )
      onOpenChange(false)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (name: string) =>
      createMeasurementUnit({
        code: toUnitCode(name),
        name,
        symbol: toUnitCode(name),
      }),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.createFailed")
      )
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.lists(),
      })
      setSelectedId(response.measurement_unit.id)
      toast.success(t("toasts.created"))
    },
  })

  const handleCreateMissing = async () => {
    const name = q.trim()
    if (!name) {
      return
    }

    const confirmed = await prompt({
      cancelText: t("actions.cancel"),
      confirmText: t("actions.create"),
      description: t("createMissing.description"),
      title: t("createMissing.title"),
    })

    if (confirmed) {
      createMutation.mutate(name)
    }
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("widget.manageTitle")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <Container className="flex items-center justify-between gap-3 px-4 py-3">
            <div>
              <Text size="small" weight="plus">
                {t("widget.selectedUnit")}
              </Text>
              <Text className="text-ui-fg-subtle" size="small">
                {selectedUnit
                  ? `${selectedUnit.name} (${selectedUnit.symbol})`
                  : t("units.none")}
              </Text>
            </div>
            <Button
              disabled={!selectedId}
              onClick={() => setSelectedId(undefined)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.clear")}
            </Button>
          </Container>
          <div className="flex flex-col gap-2">
            <Label htmlFor="product-measurement-quantity">
              {t("fields.quantity")}
            </Label>
            <Input
              id="product-measurement-quantity"
              min="0"
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={t("placeholders.quantity")}
              step="any"
              type="number"
              value={quantity}
            />
          </div>
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("placeholders.search")}
            value={q}
          />
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("columns.name")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.code")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.symbol")}</Table.HeaderCell>
                <Table.HeaderCell className="w-[1%] text-right">
                  {t("columns.actions")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <MeasurementSelectionRows
                currentUnitId={selectedId}
                isLoading={isLoading}
                onSelect={setSelectedId}
                units={units}
              />
            </Table.Body>
          </Table>
          <Table.Pagination
            canNextPage={pageIndex + 1 < pageCount}
            canPreviousPage={pageIndex > 0}
            count={count}
            nextPage={() => setPageIndex((current) => current + 1)}
            pageCount={pageCount}
            pageIndex={pageIndex}
            pageSize={PAGE_SIZE}
            previousPage={() =>
              setPageIndex((current) => Math.max(current - 1, 0))
            }
            translations={getPaginationTranslations(t)}
          />
          {q.trim() && !isLoading && !units.length ? (
            <Button
              isLoading={createMutation.isPending}
              onClick={handleCreateMissing}
              type="button"
              variant="secondary"
            >
              {t("actions.create")}
            </Button>
          ) : null}
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex justify-end gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={
                !!selectedId &&
                !(Number.isFinite(quantityNumber) && quantityNumber > 0)
              }
              isLoading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
              size="small"
              type="button"
            >
              {t("actions.save")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const ProductMeasurementWidget = ({
  data: product,
}: ProductMeasurementWidgetProps) => {
  const { t } = useTranslation("measurementUnits")
  const [open, setOpen] = useState(false)

  const { data, error, isLoading } = useQuery({
    enabled: !!product?.id,
    queryFn: () => {
      if (!product?.id) {
        throw new Error("Product id is required")
      }
      return retrieveProductMeasurement(product.id)
    },
    queryKey: measurementUnitQueryKeys.productMeasurement(product?.id),
  })

  if (!product?.id) {
    return null
  }

  const measurement = data?.measurement ?? null

  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">{t("widget.title")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {measurement
                ? `${measurement.product_unit_quantity} ${measurement.unit.symbol}`
                : t("units.none")}
            </Text>
          </div>
          <Button
            onClick={() => setOpen(true)}
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.edit")}
          </Button>
        </div>
        <div className="flex flex-col gap-2 px-6 py-4">
          <ProductMeasurementContent
            error={error}
            isLoading={isLoading}
            measurement={measurement}
          />
        </div>
      </Container>
      <ProductMeasurementDrawer
        currentMeasurement={measurement}
        onOpenChange={setOpen}
        open={open}
        productId={product.id}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductMeasurementWidget
