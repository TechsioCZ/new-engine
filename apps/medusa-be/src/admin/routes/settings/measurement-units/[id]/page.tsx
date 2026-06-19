import { ArrowLeft, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Select,
  StatusBadge,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"
import {
  deleteProductMeasurement,
  listMeasurementUnitAssignedProducts,
  type MeasurementUnitAssignedProduct,
  measurementUnitQueryKeys,
  restoreMeasurementUnit,
  retrieveMeasurementUnit,
} from "../../../../lib/measurement-units"
import {
  getPaginationTranslations,
  onRowKeyboardActivate,
} from "../../../../lib/table"
import { useDebouncedValue } from "../../../../lib/use-debounced-value"

const PAGE_SIZE = 20

const AssignedProductRows = ({
  isLoading,
  onOpen,
  onRemove,
  products,
  removeProductId,
}: {
  isLoading: boolean
  onOpen: (productId: string) => void
  onRemove: (product: MeasurementUnitAssignedProduct) => void
  products: MeasurementUnitAssignedProduct[]
  removeProductId?: string
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

  if (!products.length) {
    return (
      <Table.Row>
        <Table.Cell>{t("units.assignedProductsEmpty")}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return products.map((product) => {
    const assignmentDeleted = Boolean(product.deleted_at)

    return (
      <Table.Row
        aria-label={product.title ?? product.product_id}
        className="cursor-pointer"
        key={product.product_id}
        onClick={() => onOpen(product.product_id)}
        onKeyDown={onRowKeyboardActivate(() => onOpen(product.product_id))}
        role="button"
        tabIndex={0}
      >
        <Table.Cell>
          <Text size="small" weight="plus">
            {product.title ?? product.product_id}
          </Text>
        </Table.Cell>
        <Table.Cell className="text-ui-fg-subtle">
          {product.handle ?? "-"}
        </Table.Cell>
        <Table.Cell>
          <StatusBadge color={assignmentDeleted ? "red" : "green"}>
            {assignmentDeleted ? t("status.deleted") : t("status.active")}
          </StatusBadge>
        </Table.Cell>
        <Table.Cell onClick={(event) => event.stopPropagation()}>
          <div className="flex justify-end">
            {assignmentDeleted ? (
              <Text className="text-ui-fg-muted" size="small">
                -
              </Text>
            ) : (
              <IconButton
                aria-label={t("actions.remove")}
                disabled={removeProductId === product.product_id}
                onClick={() => onRemove(product)}
                size="small"
                type="button"
                variant="transparent"
              >
                <Trash />
              </IconButton>
            )}
          </div>
        </Table.Cell>
      </Table.Row>
    )
  })
}

const MeasurementUnitDetailPage = () => {
  const { t } = useTranslation("measurementUnits")
  const { id } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<"active" | "all" | "deleted">("active")
  const debouncedQ = useDebouncedValue(q)

  const params = useMemo(
    () => ({
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: "title",
      q: debouncedQ,
      status,
    }),
    [debouncedQ, pageIndex, status]
  )

  const {
    data: unitData,
    error: unitError,
    isLoading: unitIsLoading,
  } = useQuery({
    enabled: !!id,
    queryFn: () => {
      if (!id) {
        throw new Error("Measurement unit id is required")
      }

      return retrieveMeasurementUnit(id)
    },
    queryKey: measurementUnitQueryKeys.detail(id),
  })

  const {
    data: productsData,
    error: productsError,
    isLoading: productsAreLoading,
  } = useQuery({
    enabled: !!id,
    placeholderData: (previousData) => previousData,
    queryFn: () => {
      if (!id) {
        throw new Error("Measurement unit id is required")
      }

      return listMeasurementUnitAssignedProducts(id, params)
    },
    queryKey: measurementUnitQueryKeys.products(id, params),
  })

  const removeMutation = useMutation({
    mutationFn: (productId: string) => deleteProductMeasurement(productId),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.removeAssignmentFailed")
      )
    },
    onSuccess: async (_response, productId) => {
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.productsPrefix(id),
      })
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.detail(id),
      })
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.productMeasurement(productId),
      })
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.lists(),
      })
      toast.success(t("toasts.productMeasurementCleared"))
    },
  })

  const restoreMutation = useMutation({
    mutationFn: (unitId: string) => restoreMeasurementUnit(unitId),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.restoreFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.detail(id),
      })
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.productsPrefix(id),
      })
      await queryClient.invalidateQueries({
        queryKey: measurementUnitQueryKeys.lists(),
      })
      toast.success(t("toasts.restored"))
    },
  })

  const unit = unitData?.measurement_unit
  const products = productsData?.products ?? []
  const count = productsData?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  const handleRemove = async (product: MeasurementUnitAssignedProduct) => {
    const confirmed = await prompt({
      cancelText: t("actions.cancel"),
      confirmText: t("actions.remove"),
      description: t("detail.removeAssignmentDescription"),
      title: product.title ?? product.product_id,
    })

    if (confirmed) {
      removeMutation.mutate(product.product_id)
    }
  }

  if (unitError || productsError) {
    return (
      <Container>
        <Text className="text-ui-fg-error">{t("errors.loadDetailFailed")}</Text>
      </Container>
    )
  }

  if (unitIsLoading || !unit) {
    return (
      <Container>
        <Text>{t("status.loading")}</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <IconButton asChild type="button" variant="transparent">
            <Link
              aria-label={t("detail.backToUnits")}
              to="/settings/measurement-units"
            >
              <ArrowLeft />
            </Link>
          </IconButton>
          <Heading level="h1">{unit.name}</Heading>
          <StatusBadge color={unit.deleted_at ? "red" : "green"}>
            {unit.deleted_at ? t("status.deleted") : t("status.active")}
          </StatusBadge>
        </div>
        {unit.deleted_at ? (
          <Button
            isLoading={restoreMutation.isPending}
            onClick={() => restoreMutation.mutate(unit.id)}
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.restore")}
          </Button>
        ) : null}
      </div>

      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h2">{t("detail.details")}</Heading>
        </div>
        <div className="grid gap-3 px-6 py-4 md:grid-cols-2">
          <div>
            <Text className="text-ui-fg-subtle" size="small">
              {t("columns.code")}
            </Text>
            <Text size="small">{unit.code}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle" size="small">
              {t("columns.symbol")}
            </Text>
            <Text size="small">{unit.symbol}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle" size="small">
              {t("columns.baseQuantity")}
            </Text>
            <Text size="small">{unit.base_quantity}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle" size="small">
              {t("columns.usedBy")}
            </Text>
            <Text size="small">{unit.active_product_count ?? 0}</Text>
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex flex-col gap-4 px-6 py-4">
          <div>
            <Heading level="h2">{t("detail.assignedProducts")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("detail.assignedProductsDescription")}
            </Text>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
            <Input
              onChange={(event) => {
                setPageIndex(0)
                setQ(event.target.value)
              }}
              placeholder={t("placeholders.productSearch")}
              value={q}
            />
            <Select
              onValueChange={(value) => {
                setPageIndex(0)
                setStatus(value as "active" | "all" | "deleted")
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
                <Select.Item value="all">
                  {t("filters.allStatuses")}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>{t("columns.product")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.handle")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
              <Table.HeaderCell className="w-[1%] text-right">
                {t("columns.actions")}
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            <AssignedProductRows
              isLoading={productsAreLoading}
              onOpen={(productId) => navigate(`/products/${productId}`)}
              onRemove={handleRemove}
              products={products}
              removeProductId={removeMutation.variables}
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
      </Container>
    </div>
  )
}

export default MeasurementUnitDetailPage
