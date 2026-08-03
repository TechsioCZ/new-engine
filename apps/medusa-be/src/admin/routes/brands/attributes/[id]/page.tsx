import { ArrowLeft, Spinner } from "@medusajs/icons"
import {
  Alert,
  Button,
  Container,
  createDataTableColumnHelper,
  type DataTableColumnDef,
  Heading,
  IconButton,
  Input,
  Select,
  StatusBadge,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Link,
  type LoaderFunctionArgs,
  type UIMatch,
  useNavigate,
  useParams,
} from "react-router-dom"

import { BrandDataTable } from "../../../../components/brands/brand-data-table"
import {
  type BrandAttributeTypeBrand,
  type BrandAttributeTypeDetailResponse,
  brandQueryKeys,
  restoreBrandAttributeType,
  retrieveBrandAttributeType,
} from "../../../../lib/brands"
import { translateBreadcrumb } from "../../../../lib/breadcrumb"
import { formatLocaleCode } from "../../../../lib/format-locale-code"
import { useDebouncedValue } from "../../../../lib/use-debounced-value"

const PAGE_SIZE = 20

export async function loader({ params }: LoaderFunctionArgs) {
  const id = params["id"]

  if (!id) {
    return { attribute_type: undefined }
  }

  return retrieveBrandAttributeType(id, {
    include_deleted: true,
    limit: 1,
    offset: 0,
    order_by: "title",
  })
}

export const handle = {
  breadcrumb: (match: UIMatch<BrandAttributeTypeDetailResponse>) =>
    match.data?.attribute_type?.name ??
    match.data?.attribute_type?.id ??
    translateBreadcrumb("brands:fields.attribute", "Attribute"),
}

const ORDER_OPTIONS = [
  { labelKey: "orderOptions.brandAsc", value: "title" },
  { labelKey: "orderOptions.brandDesc", value: "-title" },
  { labelKey: "orderOptions.handleAsc", value: "handle" },
  { labelKey: "orderOptions.valueAsc", value: "attribute_value" },
  { labelKey: "orderOptions.recentlyUpdated", value: "-updated_at" },
]

const formatDate = (date: string | undefined, locale?: string) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const brandColumnHelper = createDataTableColumnHelper<BrandAttributeTypeBrand>()

const BrandAttributeDetailPage = () => {
  const { i18n, t } = useTranslation("brands")
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const [orderBy, setOrderBy] = useState("title")
  const [status, setStatus] = useState("active")
  const debouncedQ = useDebouncedValue(q)

  const params = {
    include_deleted: status === "all",
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
    order_by: orderBy,
    q: debouncedQ,
  }

  const { data, error, isLoading } = useQuery({
    enabled: !!id,
    placeholderData: (previousData) => previousData,
    queryFn: () => {
      if (!id) {
        throw new Error(t("errors.attributeIdRequired"))
      }

      return retrieveBrandAttributeType(id, params)
    },
    queryKey: brandQueryKeys.attributeTypeDetail(id, params),
  })

  const restoreMutation = useMutation({
    mutationFn: restoreBrandAttributeType,
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : t("errors.restoreAttributeFailed")
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetailPrefix(id),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypesLists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      toast.success(t("toasts.attributeRestored"))
    },
  })

  const attributeType = data?.attribute_type
  const brands = data?.brands ?? []
  const count = data?.count ?? 0
  const locale = formatLocaleCode(i18n.resolvedLanguage ?? i18n.language)
  const columns: DataTableColumnDef<BrandAttributeTypeBrand>[] = [
    brandColumnHelper.accessor("title", {
      header: t("columns.brand"),
      cell: ({ row }) => (
        <Link to={`/brands/${row.original.id}`}>{row.original.title}</Link>
      ),
    }),
    brandColumnHelper.accessor("handle", {
      header: t("columns.handle"),
    }),
    brandColumnHelper.accessor("attribute_value", {
      header: t("columns.value"),
    }),
    brandColumnHelper.accessor("active_product_count", {
      header: t("columns.products"),
    }),
    brandColumnHelper.accessor("deleted_at", {
      header: t("columns.status"),
      cell: ({ row }) => (
        <StatusBadge color={row.original.deleted_at ? "red" : "green"}>
          {row.original.deleted_at ? t("status.deleted") : t("status.active")}
        </StatusBadge>
      ),
    }),
    brandColumnHelper.accessor("updated_at", {
      header: t("columns.updated"),
      cell: ({ row }) => formatDate(row.original.updated_at, locale),
    }),
  ]

  if (error) {
    return (
      <Container>
        <Alert variant="error">{t("errors.loadAttributeFailed")}</Alert>
      </Container>
    )
  }

  if (isLoading || !attributeType) {
    return (
      <Container className="flex items-center justify-center gap-2 py-8">
        <Spinner className="animate-spin" />
        <Text size="small">{t("status.loading")}</Text>
      </Container>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <IconButton asChild type="button" variant="transparent">
          <Link aria-label={t("detail.backToBrands")} to="/brands">
            <ArrowLeft />
          </Link>
        </IconButton>
        <Heading level="h1">{attributeType.name}</Heading>
        <StatusBadge color={attributeType.deleted_at ? "red" : "green"}>
          {attributeType.deleted_at ? t("status.deleted") : t("status.active")}
        </StatusBadge>
      </div>

      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h2">{t("detail.details")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("attributes.usageCount", {
                count: attributeType.usage_count,
              })}
            </Text>
          </div>
          {attributeType.deleted_at ? (
            <Button
              isLoading={restoreMutation.isPending}
              onClick={() => restoreMutation.mutate(attributeType.id)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.restore")}
            </Button>
          ) : null}
        </div>
        <div className="grid gap-3 px-6 py-4 md:grid-cols-2">
          <div>
            <Text className="text-ui-fg-subtle" size="small">
              {t("detail.id")}
            </Text>
            <Text size="small">{attributeType.id}</Text>
          </div>
          <div>
            <Text className="text-ui-fg-subtle" size="small">
              {t("columns.status")}
            </Text>
            <Text size="small">
              {attributeType.deleted_at
                ? t("status.deleted")
                : t("status.active")}
            </Text>
          </div>
        </div>
      </Container>

      <Container className="divide-y p-0">
        <div className="flex flex-col gap-4 px-6 py-4">
          <div>
            <Heading level="h2">{t("brands.title")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("attributes.matchingBrandCount", { count })}
            </Text>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
            <Input
              onChange={(event) => {
                setPageIndex(0)
                setQ(event.target.value)
              }}
              placeholder={t("search.brands")}
              value={q}
            />
            <Select
              onValueChange={(value) => {
                setPageIndex(0)
                setOrderBy(value)
              }}
              value={orderBy}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {ORDER_OPTIONS.map((option) => (
                  <Select.Item key={option.value} value={option.value}>
                    {t(option.labelKey)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
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
                <Select.Item value="all">
                  {t("filters.allStatuses")}
                </Select.Item>
              </Select.Content>
            </Select>
          </div>
        </div>
        <BrandDataTable
          columns={columns}
          count={count}
          data={brands}
          emptyState={{
            empty: {
              description: t("brands.empty"),
              heading: t("brands.title"),
            },
            filtered: {
              description: t("brands.empty"),
              heading: t("brands.title"),
            },
          }}
          getRowId={(brand) => brand.id}
          isLoading={isLoading}
          onPageIndexChange={setPageIndex}
          onRowClick={(_event, brand) => navigate(`/brands/${brand.id}`)}
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
        />
      </Container>
    </div>
  )
}

export default BrandAttributeDetailPage
