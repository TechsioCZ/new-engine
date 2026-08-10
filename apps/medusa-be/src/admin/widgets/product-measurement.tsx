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
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  createMeasurementUnit,
  deleteProductMeasurement,
  listMeasurementUnits,
  measurementUnitQueryKeys,
  retrieveProductMeasurement,
  setProductMeasurement,
} from "../lib/measurement-units"
import type {
  MeasurementUnit,
  ProductMeasurement,
} from "../lib/measurement-units"
import { getPaginationTranslations } from "../lib/table"
import { useDebouncedValue } from "../lib/use-debounced-value"

type ProductMeasurementWidgetProps = Partial<DetailWidgetProps<AdminProduct>>

const PAGE_SIZE = 20
const CANCEL_ACTION_KEY = "actions.cancel"
const CREATE_ACTION_KEY = "actions.create"
const CREATE_MISSING_TITLE_KEY = "createMissing.title"

interface MissingUnitForm {
  base_quantity: string
  code: string
  description: string
  name: string
  symbol: string
}

type MissingUnitFormField = keyof MissingUnitForm

const toUnitCode = (value: string) => {
  const code = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, "_")
    .replaceAll(/^_+|_+$/gu, "")

  return code || "unit"
}

const createEmptyMissingUnitForm = (name = ""): MissingUnitForm => ({
  base_quantity: "1",
  code: name ? toUnitCode(name) : "",
  description: "",
  name,
  symbol: "",
})

const isUnitDeleted = (unit: MeasurementUnit | undefined): boolean =>
  Boolean(unit?.deleted_at)

const isMissingUnitFormValid = (form: MissingUnitForm): boolean => {
  const baseQuantity = Number(form.base_quantity)

  if (!Number.isFinite(baseQuantity) || baseQuantity <= 0) {
    return false
  }

  return (
    form.name.trim().length > 0 &&
    form.code.trim().length > 0 &&
    form.symbol.trim().length > 0
  )
}

const getSelectedUnit = ({
  createdUnit,
  currentMeasurement,
  selectedId,
  units,
}: {
  createdUnit?: MeasurementUnit | undefined
  currentMeasurement?: ProductMeasurement | null | undefined
  selectedId?: string | undefined
  units: MeasurementUnit[]
}): MeasurementUnit | undefined => {
  if (selectedId === undefined || selectedId.length === 0) {
    return undefined
  }

  const listedUnit = units.find((unit) => unit.id === selectedId)

  if (listedUnit !== undefined) {
    return listedUnit
  }

  if (createdUnit?.id === selectedId) {
    return createdUnit
  }

  if (currentMeasurement?.unit.id === selectedId) {
    return currentMeasurement.unit
  }

  return undefined
}

const getSaveToastKey = (hasSelection: boolean) =>
  hasSelection
    ? "toasts.productMeasurementUpdated"
    : "toasts.productMeasurementCleared"

const MeasurementSelectionRows = ({
  currentUnitId,
  isLoading,
  onSelect,
  units,
}: {
  currentUnitId?: string | undefined
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

const MeasurementUnitsTable = ({
  isLoading,
  onSelect,
  selectedId,
  units,
}: {
  isLoading: boolean
  onSelect: (unitId: string) => void
  selectedId: string | undefined
  units: MeasurementUnit[]
}) => {
  const { t } = useTranslation("measurementUnits")

  return (
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
          onSelect={onSelect}
          units={units}
        />
      </Table.Body>
    </Table>
  )
}

const SelectedMeasurementUnitSummary = ({
  hasSelection,
  onClear,
  selectedUnit,
}: {
  hasSelection: boolean
  onClear: () => void
  selectedUnit: MeasurementUnit | undefined
}) => {
  const { t } = useTranslation("measurementUnits")

  return (
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
        {isUnitDeleted(selectedUnit) ? (
          <div className="mt-1 flex flex-col gap-1">
            <StatusBadge color="red">{t("status.deleted")}</StatusBadge>
            <Text className="text-ui-fg-error" size="small">
              {t("widget.deletedUnit")}
            </Text>
          </div>
        ) : null}
      </div>
      <Button
        disabled={!hasSelection}
        onClick={onClear}
        size="small"
        type="button"
        variant="secondary"
      >
        {t("actions.clear")}
      </Button>
    </Container>
  )
}

const MissingUnitFormSection = ({
  form,
  isPending,
  isValid,
  onFieldChange,
  onSubmit,
}: {
  form: MissingUnitForm
  isPending: boolean
  isValid: boolean
  onFieldChange: (field: MissingUnitFormField, value: string) => void
  onSubmit: () => void
}) => {
  const { t } = useTranslation("measurementUnits")

  return (
    <Container className="flex flex-col gap-3 px-4 py-3">
      <Text size="small" weight="plus">
        {t(CREATE_MISSING_TITLE_KEY)}
      </Text>
      <div className="flex flex-col gap-2">
        <Label htmlFor="missing-measurement-unit-name">
          {t("fields.name")}
        </Label>
        <Input
          id="missing-measurement-unit-name"
          onChange={(event) => {
            onFieldChange("name", event.target.value)
          }}
          placeholder={t("placeholders.name")}
          required
          value={form.name}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="missing-measurement-unit-code">
            {t("fields.code")}
          </Label>
          <Input
            id="missing-measurement-unit-code"
            onChange={(event) => {
              onFieldChange("code", event.target.value)
            }}
            placeholder={t("placeholders.code")}
            required
            value={form.code}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="missing-measurement-unit-symbol">
            {t("fields.symbol")}
          </Label>
          <Input
            id="missing-measurement-unit-symbol"
            onChange={(event) => {
              onFieldChange("symbol", event.target.value)
            }}
            placeholder={t("placeholders.symbol")}
            required
            value={form.symbol}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="missing-measurement-unit-base-quantity">
          {t("fields.baseQuantity")}
        </Label>
        <Input
          id="missing-measurement-unit-base-quantity"
          onChange={(event) => {
            onFieldChange("base_quantity", event.target.value)
          }}
          placeholder={t("placeholders.baseQuantity")}
          required
          step="any"
          type="number"
          value={form.base_quantity}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="missing-measurement-unit-description">
          {t("fields.description")}
        </Label>
        <Textarea
          id="missing-measurement-unit-description"
          onChange={(event) => {
            onFieldChange("description", event.target.value)
          }}
          placeholder={t("placeholders.description")}
          value={form.description}
        />
      </div>
      <Button
        disabled={!isValid}
        isLoading={isPending}
        onClick={onSubmit}
        size="small"
        type="button"
        variant="secondary"
      >
        {t(CREATE_ACTION_KEY)}
      </Button>
    </Container>
  )
}

const ProductMeasurementContent = ({
  error,
  isLoading,
  measurement,
}: {
  error: Error | null
  isLoading: boolean
  measurement?: ProductMeasurement | null
}) => {
  const { t } = useTranslation("measurementUnits")

  if (error !== null) {
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

  const unitIsDeleted = isUnitDeleted(measurement.unit)

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

const ProductMeasurementDrawerContent = ({
  currentMeasurement,
  onOpenChange,
  open,
  productId,
}: {
  currentMeasurement?: ProductMeasurement | null | undefined
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
    () => currentMeasurement?.unit.id,
  )
  const [createdUnit, setCreatedUnit] = useState<MeasurementUnit | undefined>()
  const [createMissingOpen, setCreateMissingOpen] = useState(false)
  const [missingUnitForm, setMissingUnitForm] = useState<MissingUnitForm>(() =>
    createEmptyMissingUnitForm(),
  )

  const params = {
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
    order_by: "name",
    q: debouncedQ,
  }

  const { data, isLoading } = useQuery({
    enabled: open,
    queryFn: async () => await listMeasurementUnits(params),
    queryKey: measurementUnitQueryKeys.list(params),
  })

  const units = data?.measurement_units ?? []
  const selectedUnit = getSelectedUnit({
    createdUnit,
    currentMeasurement,
    selectedId,
    units,
  })
  const hasSelection = selectedId !== undefined && selectedId.length > 0
  const selectedUnitIsDeleted = isUnitDeleted(selectedUnit)
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)
  const searchTerm = q.trim()
  const missingUnitIsValid = isMissingUnitFormValid(missingUnitForm)
  const canCreateMissing = searchTerm.length > 0 && !isLoading
  const canPromptCreateMissing =
    canCreateMissing && units.length > 0 && !createMissingOpen
  const shouldShowMissingForm =
    canCreateMissing && (units.length === 0 || createMissingOpen)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (selectedId === undefined || selectedId.length === 0) {
        return await deleteProductMeasurement(productId)
      }

      return await setProductMeasurement(productId, {
        measurement_unit_id: selectedId,
      })
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveFailed"),
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
      toast.success(t(getSaveToastKey(hasSelection)))
      onOpenChange(false)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (input: MissingUnitForm) =>
      await createMeasurementUnit({
        base_quantity: Number(input.base_quantity),
        code: input.code.trim(),
        description: input.description.trim() || null,
        name: input.name.trim(),
        symbol: input.symbol.trim(),
      }),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.createFailed"),
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

  const handleMissingUnitFieldChange = (
    field: MissingUnitFormField,
    value: string,
  ) => {
    setMissingUnitForm((current) => ({ ...current, [field]: value }))
  }

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
    const activeUnit = existing.measurement_units.find(
      (unit) => unit.code === normalizedCode && !isUnitDeleted(unit),
    )
    const deletedUnit = existing.measurement_units.find(
      (unit) => unit.code === normalizedCode && isUnitDeleted(unit),
    )

    if (activeUnit) {
      toast.info(t("createMissing.activeTitle"), {
        description: t("createMissing.activeDescription", {
          code: normalizedCode,
        }),
      })
      onOpenChange(false)
      navigate(`/settings/measurement-units/${activeUnit.id}`)
      return
    }

    if (deletedUnit) {
      const viewDeletedUnit = await prompt({
        cancelText: t(CANCEL_ACTION_KEY),
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
      cancelText: t(CANCEL_ACTION_KEY),
      confirmText: t(CREATE_ACTION_KEY),
      description: t("createMissing.description"),
      title: t(CREATE_MISSING_TITLE_KEY),
    })

    if (confirmed) {
      createMutation.mutate({
        ...missingUnitForm,
        code: normalizedCode,
      })
    }
  }

  return (
    <>
      <Drawer.Header>
        <Drawer.Title>{t("widget.manageTitle")}</Drawer.Title>
      </Drawer.Header>
      <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
        <SelectedMeasurementUnitSummary
          hasSelection={hasSelection}
          onClear={() => {
            setSelectedId(undefined)
          }}
          selectedUnit={selectedUnit}
        />
        <Input
          onChange={(event) => {
            const { value } = event.target
            setPageIndex(0)
            setQ(value)
            setCreateMissingOpen(false)
            setMissingUnitForm(createEmptyMissingUnitForm(value.trim()))
          }}
          placeholder={t("placeholders.search")}
          value={q}
        />
        {canPromptCreateMissing ? (
          <Container className="flex items-center justify-between gap-3 px-4 py-3">
            <Text size="small" weight="plus">
              {t(CREATE_MISSING_TITLE_KEY)}
            </Text>
            <Button
              onClick={() => {
                setCreateMissingOpen(true)
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {t(CREATE_ACTION_KEY)}
            </Button>
          </Container>
        ) : null}
        {shouldShowMissingForm ? (
          <MissingUnitFormSection
            form={missingUnitForm}
            isPending={createMutation.isPending}
            isValid={missingUnitIsValid}
            onFieldChange={handleMissingUnitFieldChange}
            onSubmit={() => {
              void handleCreateMissing()
            }}
          />
        ) : null}
        <MeasurementUnitsTable
          isLoading={isLoading}
          onSelect={(unitId) => {
            setSelectedId(unitId)
            setCreateMissingOpen(false)
          }}
          selectedId={selectedId}
          units={units}
        />
        <Table.Pagination
          canNextPage={pageIndex + 1 < pageCount}
          canPreviousPage={pageIndex > 0}
          count={count}
          nextPage={() => {
            setPageIndex((current) => current + 1)
          }}
          pageCount={pageCount}
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          previousPage={() => {
            setPageIndex((current) => Math.max(current - 1, 0))
          }}
          translations={getPaginationTranslations(t)}
        />
      </Drawer.Body>
      <Drawer.Footer>
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              onOpenChange(false)
            }}
            size="small"
            type="button"
            variant="secondary"
          >
            {t(CANCEL_ACTION_KEY)}
          </Button>
          <Button
            disabled={selectedUnitIsDeleted}
            isLoading={saveMutation.isPending}
            onClick={() => {
              saveMutation.mutate()
            }}
            size="small"
            type="button"
          >
            {t("actions.save")}
          </Button>
        </div>
      </Drawer.Footer>
    </>
  )
}

/**
 * The drawer body seeds its draft state from the assigned unit when it mounts.
 * Keying it on that unit remounts the body whenever the assignment changes, so
 * the draft is reseeded without synchronising state from props inside an effect.
 * Medusa's drawer renders its content in a Radix portal that unmounts while
 * closed, so reopening the drawer always starts from a fresh draft.
 */
const ProductMeasurementDrawer = ({
  currentMeasurement,
  onOpenChange,
  open,
  productId,
}: {
  currentMeasurement?: ProductMeasurement | null | undefined
  onOpenChange: (open: boolean) => void
  open: boolean
  productId: string
}) => (
  <Drawer onOpenChange={onOpenChange} open={open}>
    <Drawer.Content>
      <ProductMeasurementDrawerContent
        currentMeasurement={currentMeasurement}
        key={currentMeasurement?.unit.id ?? "unassigned"}
        onOpenChange={onOpenChange}
        open={open}
        productId={productId}
      />
    </Drawer.Content>
  </Drawer>
)

const ProductMeasurementWidget = ({
  data: product,
}: ProductMeasurementWidgetProps) => {
  const { t } = useTranslation("measurementUnits")
  const [open, setOpen] = useState(false)
  const productId = product?.id
  const hasProductId = productId !== undefined && productId.length > 0

  const { data, error, isLoading } = useQuery({
    enabled: hasProductId,
    queryFn: async () => {
      if (productId === undefined || productId.length === 0) {
        throw new Error("Product id is required")
      }

      return await retrieveProductMeasurement(productId)
    },
    queryKey: measurementUnitQueryKeys.productMeasurement(productId),
  })

  if (productId === undefined || productId.length === 0) {
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
            onClick={() => {
              setOpen(true)
            }}
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
        productId={productId}
      />
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductMeasurementWidget
