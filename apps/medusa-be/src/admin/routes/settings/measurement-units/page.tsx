import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings, PencilSquare, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
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
import type { FormEvent } from "react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
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
  code: unit?.code ?? "",
  description: unit?.description ?? "",
  name: unit?.name ?? "",
  symbol: unit?.symbol ?? "",
})

const normalizeInput = (input: MeasurementUnitInput): MeasurementUnitInput => ({
  code: input.code.trim(),
  description: input.description?.trim() || null,
  name: input.name.trim(),
  symbol: input.symbol.trim(),
})

const MeasurementUnitFormDrawer = ({
  onOpenChange,
  open,
  unit,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  unit?: MeasurementUnit
}) => {
  const { t } = useTranslation("measurementUnits")
  const queryClient = useQueryClient()
  const [form, setForm] = useState<MeasurementUnitInput>(() =>
    toFormState(unit)
  )

  const mutation = useMutation({
    mutationFn: (input: MeasurementUnitInput) =>
      unit
        ? updateMeasurementUnit(unit.id, input)
        : createMeasurementUnit(input),
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
      toast.success(unit ? t("toasts.updated") : t("toasts.created"))
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
            <Drawer.Title>
              {unit ? t("actions.edit") : t("actions.create")}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
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
                <Label htmlFor="measurement-unit-code">
                  {t("fields.code")}
                </Label>
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
                <Label htmlFor="measurement-unit-symbol">
                  {t("fields.symbol")}
                </Label>
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
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="secondary"
              >
                {t("actions.cancel")}
              </Button>
              <Button isLoading={mutation.isPending} type="submit">
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
      include_deleted: status === "all",
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: "name",
      q: debouncedQ,
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
      description: `${unit.name} (${unit.code})`,
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
        </Table.Row>
      )
    }

    return units.map((unit) => (
      <Table.Row key={unit.id}>
        <Table.Cell>{unit.name}</Table.Cell>
        <Table.Cell className="text-ui-fg-subtle">{unit.code}</Table.Cell>
        <Table.Cell>{unit.symbol}</Table.Cell>
        <Table.Cell>{unit.active_product_count ?? 0}</Table.Cell>
        <Table.Cell>
          <StatusBadge color={unit.deleted_at ? "red" : "green"}>
            {unit.deleted_at ? t("status.deleted") : t("status.active")}
          </StatusBadge>
        </Table.Cell>
        <Table.Cell>
          <div className="flex justify-end gap-1">
            {unit.deleted_at ? (
              <Button
                onClick={() => restoreMutation.mutate(unit.id)}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.restore")}
              </Button>
            ) : (
              <>
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
        <MeasurementUnitFormDrawer
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
