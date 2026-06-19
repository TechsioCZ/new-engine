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
  StatusBadge,
  Table,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
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

type MissingUnitForm = {
  base_quantity: string
  code: string
  description: string
  name: string
  symbol: string
}

const createEmptyMissingUnitForm = (name = ""): MissingUnitForm => ({
  base_quantity: "1",
  code: name ? toUnitCode(name) : "",
  description: "",
  name,
  symbol: "",
})

const toUnitCode = (value: string) => {
  const code = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "")

  return code || "unit"
}

const getSelectedUnit = ({
  createdUnit,
  currentMeasurement,
  selectedId,
  units,
}: {
  createdUnit?: MeasurementUnit
  currentMeasurement?: ProductMeasurement | null
  selectedId?: string
  units: MeasurementUnit[]
}) => {
  if (!selectedId) {
    return
  }

  return (
    units.find((unit) => unit.id === selectedId) ??
    (createdUnit?.id === selectedId ? createdUnit : undefined) ??
    (currentMeasurement?.unit.id === selectedId
      ? currentMeasurement.unit
      : undefined)
  )
}

const getSaveToastKey = (selectedId: string | undefined) =>
  selectedId
    ? "toasts.productMeasurementUpdated"
    : "toasts.productMeasurementCleared"

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
        <Table.Cell>{unit.base_quantity}</Table.Cell>
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

  const unitIsDeleted = Boolean(measurement.unit.deleted_at)

  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <Text size="small" weight="plus">
            {measurement.unit.name}
          </Text>
          {unitIsDeleted ? (
            <StatusBadge color="red">{t("status.deleted")}</StatusBadge>
          ) : null}
        </div>
        <Text className="text-ui-fg-subtle" size="small">
          {measurement.unit.code} · {measurement.unit.symbol}
        </Text>
      </div>
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
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const debouncedQ = useDebouncedValue(q)
  const [selectedId, setSelectedId] = useState<string | undefined>(
    () => currentMeasurement?.unit.id
  )
  const [createdUnit, setCreatedUnit] = useState<MeasurementUnit | undefined>()
  const [createMissingOpen, setCreateMissingOpen] = useState(false)
  const [missingUnitForm, setMissingUnitForm] = useState<MissingUnitForm>(() =>
    createEmptyMissingUnitForm()
  )

  useEffect(() => {
    if (open) {
      setPageIndex(0)
      setQ("")
      setSelectedId(currentMeasurement?.unit.id)
      setCreatedUnit(undefined)
      setCreateMissingOpen(false)
      setMissingUnitForm(createEmptyMissingUnitForm())
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
  const selectedUnit = getSelectedUnit({
    createdUnit,
    currentMeasurement,
    selectedId,
    units,
  })
  const selectedUnitIsDeleted = Boolean(selectedUnit?.deleted_at)
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)
  const searchTerm = q.trim()
  const missingUnitBaseQuantity = Number(missingUnitForm.base_quantity)
  const missingUnitIsValid =
    missingUnitForm.name.trim().length > 0 &&
    missingUnitForm.code.trim().length > 0 &&
    missingUnitForm.symbol.trim().length > 0 &&
    Number.isFinite(missingUnitBaseQuantity) &&
    missingUnitBaseQuantity > 0
  const canCreateMissing = !!searchTerm && !isLoading
  const shouldShowMissingForm =
    canCreateMissing && (!units.length || createMissingOpen)

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!selectedId) {
        return deleteProductMeasurement(productId)
      }

      return setProductMeasurement(productId, {
        measurement_unit_id: selectedId,
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
        queryKey:
          measurementUnitQueryKeys.productVariantMeasurements(productId),
      })
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({ queryKey: ["product", productId] })
      await queryClient.invalidateQueries({ queryKey: ["products"] })
      toast.success(t(getSaveToastKey(selectedId)))
      onOpenChange(false)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (input: MissingUnitForm) =>
      createMeasurementUnit({
        base_quantity: Number(input.base_quantity),
        code: input.code.trim(),
        description: input.description.trim() || null,
        name: input.name.trim(),
        symbol: input.symbol.trim(),
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
      setCreatedUnit(response.measurement_unit)
      setSelectedId(response.measurement_unit.id)
      setCreateMissingOpen(false)
      toast.success(t("toasts.created"))
    },
  })

  const handleCreateMissing = async () => {
    if (!missingUnitIsValid) {
      return
    }

    const normalizedCode = toUnitCode(missingUnitForm.code)
    const existing = await listMeasurementUnits({
      code: normalizedCode,
      limit: 1,
      offset: 0,
      order_by: "name",
      status: "all",
    })
    const deletedUnit = existing.measurement_units.find(
      (unit) => unit.code === normalizedCode && unit.deleted_at
    )

    if (deletedUnit) {
      const viewDeletedUnit = await prompt({
        cancelText: t("actions.cancel"),
        confirmText: t("actions.view"),
        description: t("createMissing.deletedDescription", {
          code: normalizedCode,
        }),
        title: t("createMissing.deletedTitle"),
      })

      if (viewDeletedUnit) {
        onOpenChange(false)
        navigate(`/settings/measurement-units/${deletedUnit.id}`)
      }

      return
    }

    const confirmed = await prompt({
      cancelText: t("actions.cancel"),
      confirmText: t("actions.create"),
      description: t("createMissing.description"),
      title: t("createMissing.title"),
    })

    if (confirmed) {
      createMutation.mutate({
        ...missingUnitForm,
        code: normalizedCode,
      })
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
              {selectedUnit?.deleted_at ? (
                <div className="mt-1 flex flex-col gap-1">
                  <StatusBadge color="red">{t("status.deleted")}</StatusBadge>
                  <Text className="text-ui-fg-error" size="small">
                    {t("widget.deletedUnit")}
                  </Text>
                </div>
              ) : null}
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
          <Input
            onChange={(event) => {
              const value = event.target.value
              setPageIndex(0)
              setQ(value)
              setCreateMissingOpen(false)
              setMissingUnitForm(createEmptyMissingUnitForm(value.trim()))
            }}
            placeholder={t("placeholders.search")}
            value={q}
          />
          {canCreateMissing && units.length && !createMissingOpen ? (
            <Container className="flex items-center justify-between gap-3 px-4 py-3">
              <Text size="small" weight="plus">
                {t("createMissing.title")}
              </Text>
              <Button
                onClick={() => setCreateMissingOpen(true)}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.create")}
              </Button>
            </Container>
          ) : null}
          {shouldShowMissingForm ? (
            <Container className="flex flex-col gap-3 px-4 py-3">
              <Text size="small" weight="plus">
                {t("createMissing.title")}
              </Text>
              <div className="flex flex-col gap-2">
                <Label htmlFor="missing-measurement-unit-name">
                  {t("fields.name")}
                </Label>
                <Input
                  id="missing-measurement-unit-name"
                  onChange={(event) =>
                    setMissingUnitForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder={t("placeholders.name")}
                  required
                  value={missingUnitForm.name}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="missing-measurement-unit-code">
                    {t("fields.code")}
                  </Label>
                  <Input
                    id="missing-measurement-unit-code"
                    onChange={(event) =>
                      setMissingUnitForm((current) => ({
                        ...current,
                        code: event.target.value,
                      }))
                    }
                    placeholder={t("placeholders.code")}
                    required
                    value={missingUnitForm.code}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="missing-measurement-unit-symbol">
                    {t("fields.symbol")}
                  </Label>
                  <Input
                    id="missing-measurement-unit-symbol"
                    onChange={(event) =>
                      setMissingUnitForm((current) => ({
                        ...current,
                        symbol: event.target.value,
                      }))
                    }
                    placeholder={t("placeholders.symbol")}
                    required
                    value={missingUnitForm.symbol}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="missing-measurement-unit-base-quantity">
                  {t("fields.baseQuantity")}
                </Label>
                <Input
                  id="missing-measurement-unit-base-quantity"
                  onChange={(event) =>
                    setMissingUnitForm((current) => ({
                      ...current,
                      base_quantity: event.target.value,
                    }))
                  }
                  placeholder={t("placeholders.baseQuantity")}
                  required
                  step="any"
                  type="number"
                  value={missingUnitForm.base_quantity}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="missing-measurement-unit-description">
                  {t("fields.description")}
                </Label>
                <Textarea
                  id="missing-measurement-unit-description"
                  onChange={(event) =>
                    setMissingUnitForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder={t("placeholders.description")}
                  value={missingUnitForm.description}
                />
              </div>
              <Button
                disabled={!missingUnitIsValid}
                isLoading={createMutation.isPending}
                onClick={handleCreateMissing}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.create")}
              </Button>
            </Container>
          ) : null}
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>{t("columns.name")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.code")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.symbol")}</Table.HeaderCell>
                <Table.HeaderCell>{t("columns.baseQuantity")}</Table.HeaderCell>
                <Table.HeaderCell className="w-[1%] text-right">
                  {t("columns.actions")}
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <MeasurementSelectionRows
                currentUnitId={selectedId}
                isLoading={isLoading}
                onSelect={(unitId) => {
                  setSelectedId(unitId)
                  setCreateMissingOpen(false)
                }}
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
              disabled={selectedUnitIsDeleted}
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
