import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings, PencilSquare, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  FocusModal,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  StatusBadge,
  Table,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { Dispatch, FormEvent, SetStateAction } from "react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import {
  createMeasurementUnit,
  deleteMeasurementUnit,
  listMeasurementUnits,
  type MeasurementUnit,
  type MeasurementUnitInput,
  measurementUnitQueryKeys,
  restoreMeasurementUnit,
  updateMeasurementUnit,
} from "../../../lib/measurement-units"
import { getPaginationTranslations } from "../../../lib/table"
import { useDebouncedValue } from "../../../lib/use-debounced-value"

const PAGE_SIZE = 20

const toFormState = (unit?: MeasurementUnit): MeasurementUnitInput => ({
  base_quantity: unit?.base_quantity ?? 1,
  code: unit?.code ?? "",
  description: unit?.description ?? "",
  name: unit?.name ?? "",
  symbol: unit?.symbol ?? "",
})

const normalizeInput = (input: MeasurementUnitInput): MeasurementUnitInput => ({
  base_quantity: Number(input.base_quantity),
  code: input.code.trim(),
  description: input.description?.trim() || null,
  name: input.name.trim(),
  symbol: input.symbol.trim(),
})

const getFormIsValid = (form: MeasurementUnitInput) => {
  const baseQuantity = Number(form.base_quantity)

  return (
    form.name.trim().length > 0 &&
    form.code.trim().length > 0 &&
    form.symbol.trim().length > 0 &&
    Number.isFinite(baseQuantity) &&
    baseQuantity > 0
  )
}

const MeasurementUnitFormFields = ({
  form,
  setForm,
}: {
  form: MeasurementUnitInput
  setForm: Dispatch<SetStateAction<MeasurementUnitInput>>
}) => {
  const { t } = useTranslation("measurementUnits")

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label htmlFor="measurement-unit-name">{t("fields.name")}</Label>
        <Input
          id="measurement-unit-name"
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              name: event.target.value,
            }))
          }
          placeholder={t("placeholders.name")}
          required
          value={form.name}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="measurement-unit-code">{t("fields.code")}</Label>
          <Input
            id="measurement-unit-code"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                code: event.target.value,
              }))
            }
            placeholder={t("placeholders.code")}
            required
            value={form.code}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="measurement-unit-symbol">{t("fields.symbol")}</Label>
          <Input
            id="measurement-unit-symbol"
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                symbol: event.target.value,
              }))
            }
            placeholder={t("placeholders.symbol")}
            required
            value={form.symbol}
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="measurement-unit-base-quantity">
          {t("fields.baseQuantity")}
        </Label>
        <Input
          id="measurement-unit-base-quantity"
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              base_quantity: Number(event.target.value),
            }))
          }
          placeholder={t("placeholders.baseQuantity")}
          required
          step="any"
          type="number"
          value={form.base_quantity}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="measurement-unit-description">
          {t("fields.description")}
        </Label>
        <Textarea
          id="measurement-unit-description"
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              description: event.target.value,
            }))
          }
          placeholder={t("placeholders.description")}
          value={form.description ?? ""}
        />
      </div>
    </>
  )
}

const MeasurementUnitCreateModal = ({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) => {
  const { t } = useTranslation("measurementUnits")
  const queryClient = useQueryClient()
  const [form, setForm] = useState<MeasurementUnitInput>(() => toFormState())
  const formIsValid = getFormIsValid(form)

  const mutation = useMutation({
    mutationFn: createMeasurementUnit,
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.details(),
      })
      toast.success(t("toasts.created"))
      onOpenChange(false)
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(normalizeInput(form))
  }

  return (
    <FocusModal onOpenChange={onOpenChange} open={open}>
      <FocusModal.Content>
        <form
          className="flex h-full flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <FocusModal.Header>
            <FocusModal.Title>{t("actions.create")}</FocusModal.Title>
          </FocusModal.Header>
          <FocusModal.Body className="flex flex-1 justify-center overflow-y-auto">
            <div className="flex w-full max-w-[720px] flex-col gap-4 px-6 py-8">
              <MeasurementUnitFormFields form={form} setForm={setForm} />
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
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
                disabled={!formIsValid}
                isLoading={mutation.isPending}
                size="small"
                type="submit"
              >
                {t("actions.save")}
              </Button>
            </div>
          </FocusModal.Footer>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}

const MeasurementUnitFormDrawer = ({
  onOpenChange,
  open,
  unit,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  unit: MeasurementUnit
}) => {
  const { t } = useTranslation("measurementUnits")
  const queryClient = useQueryClient()
  const [form, setForm] = useState<MeasurementUnitInput>(() =>
    toFormState(unit)
  )
  const formIsValid = getFormIsValid(form)

  const mutation = useMutation({
    mutationFn: (input: MeasurementUnitInput) =>
      updateMeasurementUnit(unit.id, input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.details(),
      })
      toast.success(t("toasts.updated"))
      onOpenChange(false)
    },
  })

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    mutation.mutate(normalizeInput(form))
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <form onSubmit={handleSubmit}>
          <Drawer.Header>
            <Drawer.Title>{t("actions.edit")}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
            <MeasurementUnitFormFields form={form} setForm={setForm} />
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
                disabled={!formIsValid}
                isLoading={mutation.isPending}
                size="small"
                type="submit"
              >
                {t("actions.save")}
              </Button>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}

const MeasurementUnitsSettingsPage = () => {
  const { t } = useTranslation("measurementUnits")
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUnit, setEditingUnit] = useState<MeasurementUnit | undefined>()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("active")
  const debouncedQ = useDebouncedValue(q)

  const params = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: "name",
      q: debouncedQ,
      status: status as "active" | "all" | "deleted",
    }),
    [debouncedQ, pageIndex, status]
  )

  const { data, error, isLoading } = useQuery({
    queryFn: () => listMeasurementUnits(params),
    queryKey: measurementUnitQueryKeys.list(params),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteMeasurementUnit,
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : t("errors.deleteFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.lists(),
      })
      toast.success(t("toasts.deleted"))
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restoreMeasurementUnit,
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : t("errors.restoreFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.lists(),
      })
      toast.success(t("toasts.restored"))
    },
  })

  const units = data?.measurement_units ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  const handleDelete = async (unit: MeasurementUnit) => {
    const confirmed = await prompt({
      cancelText: t("actions.cancel"),
      confirmText: t("actions.delete"),
      description: unit.active_product_count
        ? t("deletePrompt.assignedDescription", {
            count: unit.active_product_count,
          })
        : t("deletePrompt.description"),
      title: t("actions.delete"),
    })

    if (confirmed) {
      deleteMutation.mutate(unit.id)
    }
  }

  const renderRows = () => {
    if (isLoading) {
      return (
        <Table.Row>
          <Table.Cell>{t("status.loading")}</Table.Cell>
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
        </Table.Row>
      )
    }

    if (error) {
      return (
        <Table.Row>
          <Table.Cell className="text-ui-fg-error">
            {t("errors.loadFailed")}
          </Table.Cell>
          <Table.Cell />
          <Table.Cell />
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
          <Table.Cell />
          <Table.Cell />
        </Table.Row>
      )
    }

    return units.map((unit) => (
      <Table.Row key={unit.id}>
        <Table.Cell>{unit.name}</Table.Cell>
        <Table.Cell className="text-ui-fg-subtle">{unit.code}</Table.Cell>
        <Table.Cell>{unit.symbol}</Table.Cell>
        <Table.Cell>{unit.base_quantity}</Table.Cell>
        <Table.Cell>{unit.active_product_count ?? 0}</Table.Cell>
        <Table.Cell>
          <StatusBadge color={unit.deleted_at ? "red" : "green"}>
            {unit.deleted_at ? t("status.deleted") : t("status.active")}
          </StatusBadge>
        </Table.Cell>
        <Table.Cell>
          <div className="flex justify-end gap-1">
            {unit.deleted_at ? (
              <>
                <Button asChild size="small" variant="secondary">
                  <Link to={`/settings/measurement-units/${unit.id}`}>
                    {t("actions.view")}
                  </Link>
                </Button>
                <Button
                  onClick={() => restoreMutation.mutate(unit.id)}
                  size="small"
                  type="button"
                  variant="secondary"
                >
                  {t("actions.restore")}
                </Button>
              </>
            ) : (
              <>
                <Button asChild size="small" variant="secondary">
                  <Link to={`/settings/measurement-units/${unit.id}`}>
                    {t("actions.view")}
                  </Link>
                </Button>
                <IconButton
                  aria-label={t("actions.edit")}
                  onClick={() => setEditingUnit(unit)}
                  size="small"
                  type="button"
                  variant="transparent"
                >
                  <PencilSquare />
                </IconButton>
                <IconButton
                  aria-label={t("actions.delete")}
                  disabled={
                    deleteMutation.isPending &&
                    deleteMutation.variables === unit.id
                  }
                  onClick={() => handleDelete(unit)}
                  size="small"
                  type="button"
                  variant="transparent"
                >
                  <Trash />
                </IconButton>
              </>
            )}
          </div>
        </Table.Cell>
      </Table.Row>
    ))
  }

  return (
    <>
      <Container className="flex flex-col divide-y p-0">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading>{t("title")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {count} {t("pagination.results")}
            </Text>
          </div>
          <Button onClick={() => setCreateOpen(true)} type="button">
            {t("actions.add")}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 px-6 py-4 md:grid-cols-[minmax(0,1fr)_180px]">
          <Input
            onChange={(event) => {
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("placeholders.search")}
            value={q}
          />
          <Select
            onValueChange={(value) => {
              setPageIndex(0)
              setStatus(value)
            }}
            value={status}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="active">
                {t("filters.activeOnly")}
              </Select.Item>
              <Select.Item value="deleted">
                {t("filters.deletedOnly")}
              </Select.Item>
              <Select.Item value="all">{t("filters.allStatuses")}</Select.Item>
            </Select.Content>
          </Select>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("columns.name")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.code")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.symbol")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.baseQuantity")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.usedBy")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
              <Table.HeaderCell className="w-[1%] text-right">
                {t("columns.actions")}
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>{renderRows()}</Table.Body>
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
      </Container>
      {createOpen ? (
        <MeasurementUnitCreateModal
          onOpenChange={setCreateOpen}
          open={createOpen}
        />
      ) : null}
      {editingUnit ? (
        <MeasurementUnitFormDrawer
          onOpenChange={(open) => {
            if (!open) {
              setEditingUnit(undefined)
            }
          }}
          open={!!editingUnit}
          unit={editingUnit}
        />
      ) : null}
    </>
  )
}

export const config = defineRouteConfig({
  icon: Buildings,
  label: "menuItem",
  translationNs: "measurementUnits",
})

export default MeasurementUnitsSettingsPage
