import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings, PencilSquare, Trash } from "@medusajs/icons"
import {
  Alert,
  Button,
  Container,
  createDataTableColumnHelper,
  Heading,
  Input,
  Select,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import type { DataTableColumnDef } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { hasTrimmedString } from "@techsio/std/string"
import type { TFunction } from "i18next"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { BrandDataTable } from "../../components/brands/brand-data-table"
import {
  BrandCreateModal,
  BrandEditDrawer,
} from "../../components/brands/brand-form"
import {
  brandQueryKeys,
  createBrandAttributeType,
  deleteBrand,
  deleteBrandAttributeType,
  listBrandAttributeTypes,
  listBrands,
  restoreBrand,
  restoreBrandAttributeType,
  retrieveBrand,
} from "../../lib/brands"
import type { Brand, BrandAttributeType } from "../../lib/brands"
import { translateBreadcrumb } from "../../lib/breadcrumb"
import { formatLocaleCode } from "../../lib/format-locale-code"
import { useDebouncedValue } from "../../lib/use-debounced-value"

const PAGE_SIZE = 20
const ATTRIBUTE_TYPE_OPTION_LIMIT = 100

const ACTION_CANCEL = "actions.cancel"
const ACTION_DELETE = "actions.delete"
const ACTION_RESTORE = "actions.restore"
const ATTRIBUTES_TITLE = "attributes.title"
const BRANDS_TITLE = "brands.title"

export const handle = {
  breadcrumb: () => translateBreadcrumb("brands:menuItem", "Brands"),
}

const ORDER_OPTIONS = [
  { labelKey: "orderOptions.titleAsc", value: "title" },
  { labelKey: "orderOptions.titleDesc", value: "-title" },
  { labelKey: "orderOptions.handleAsc", value: "handle" },
  { labelKey: "orderOptions.newest", value: "-created_at" },
  { labelKey: "orderOptions.recentlyUpdated", value: "-updated_at" },
]

const ATTRIBUTE_TYPES_PARAMS = {
  include_deleted: true,
  limit: ATTRIBUTE_TYPE_OPTION_LIMIT,
  offset: 0,
  order_by: "name",
}

const formatDate = (date: string | undefined, locale?: string) => {
  if (!hasTrimmedString(date)) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

interface PendingRowMutation {
  isPending: boolean
  variables: string | undefined
}

const createRowMutationGuard =
  (...mutations: PendingRowMutation[]) =>
  (rowId: string) =>
    mutations.some(
      (mutation) => mutation.isPending && mutation.variables === rowId,
    )

const brandColumnHelper = createDataTableColumnHelper<Brand>()
const attributeTypeColumnHelper =
  createDataTableColumnHelper<BrandAttributeType>()

interface AttributeTypeColumnsOptions {
  isRowMutating: (rowId: string) => boolean
  onDelete: (attributeType: BrandAttributeType) => void
  onRestore: (attributeTypeId: string) => void
  t: TFunction
}

const buildAttributeTypeColumns = ({
  isRowMutating,
  onDelete,
  onRestore,
  t,
}: AttributeTypeColumnsOptions): DataTableColumnDef<BrandAttributeType>[] => [
  {
    accessorKey: "name",
    cell: ({ row }) => (
      <Link to={`/brands/attributes/${row.original.id}`}>
        {row.original.name}
      </Link>
    ),
    header: t("columns.name"),
  },
  {
    accessorKey: "deleted_at",
    cell: ({ row }) => (
      <StatusBadge
        color={hasTrimmedString(row.original.deleted_at) ? "red" : "green"}
      >
        {hasTrimmedString(row.original.deleted_at)
          ? t("status.deleted")
          : t("status.active")}
      </StatusBadge>
    ),
    header: t("columns.status"),
  },
  {
    accessorKey: "usage_count",
    header: t("columns.usedBy"),
  },
  attributeTypeColumnHelper.action({
    actions: ({ row }) => {
      if (isRowMutating(row.original.id)) {
        return []
      }

      return hasTrimmedString(row.original.deleted_at)
        ? [
            {
              label: t(ACTION_RESTORE),
              onClick: () => {
                onRestore(row.original.id)
              },
            },
          ]
        : [
            {
              icon: <Trash />,
              label: t(ACTION_DELETE),
              onClick: () => {
                onDelete(row.original)
              },
            },
          ]
    },
  }),
]

interface BrandColumnsOptions {
  isRowMutating: (rowId: string) => boolean
  locale: string
  onDelete: (brand: Brand) => void
  onEdit: (brandId: string) => void
  onRestore: (brand: Brand) => void
  t: TFunction
}

const buildBrandColumns = ({
  isRowMutating,
  locale,
  onDelete,
  onEdit,
  onRestore,
  t,
}: BrandColumnsOptions): DataTableColumnDef<Brand>[] => [
  {
    accessorKey: "title",
    cell: ({ row }) => (
      <Link to={`/brands/${row.original.id}`}>{row.original.title}</Link>
    ),
    header: t("columns.title"),
  },
  {
    accessorKey: "handle",
    header: t("columns.handle"),
  },
  {
    accessorFn: (brand) => brand.attributes.length,
    header: t("columns.attributes"),
    id: "attributes",
  },
  {
    accessorKey: "active_product_count",
    header: t("columns.products"),
  },
  {
    accessorKey: "deleted_at",
    cell: ({ row }) => (
      <StatusBadge
        color={hasTrimmedString(row.original.deleted_at) ? "red" : "green"}
      >
        {hasTrimmedString(row.original.deleted_at)
          ? t("status.deleted")
          : t("status.active")}
      </StatusBadge>
    ),
    header: t("columns.status"),
  },
  {
    accessorKey: "updated_at",
    cell: ({ row }) => formatDate(row.original.updated_at, locale),
    header: t("columns.updated"),
  },
  brandColumnHelper.action({
    actions: ({ row }) => {
      if (isRowMutating(row.original.id)) {
        return []
      }

      return hasTrimmedString(row.original.deleted_at)
        ? [
            {
              label: t(ACTION_RESTORE),
              onClick: () => {
                onRestore(row.original)
              },
            },
          ]
        : [
            {
              icon: <PencilSquare />,
              label: t("actions.edit"),
              onClick: () => {
                onEdit(row.original.id)
              },
            },
            {
              icon: <Trash />,
              label: t(ACTION_DELETE),
              onClick: () => {
                onDelete(row.original)
              },
            },
          ]
    },
  }),
]

interface AttributeTypesToolbarProps {
  count: number
  isCreating: boolean
  name: string
  onCreate: () => void
  onNameChange: (value: string) => void
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  q: string
  status: string
}

const AttributeTypesToolbar = ({
  count,
  isCreating,
  name,
  onCreate,
  onNameChange,
  onSearchChange,
  onStatusChange,
  q,
  status,
}: AttributeTypesToolbarProps) => {
  const { t } = useTranslation("brands")

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h2">{t(ATTRIBUTES_TITLE)}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("attributes.count", { count })}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Input
            onChange={(event) => {
              onNameChange(event.target.value)
            }}
            placeholder={t("attributes.newPlaceholder")}
            value={name}
          />
          <Button
            disabled={!name.trim()}
            isLoading={isCreating}
            onClick={onCreate}
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.add")}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px]">
        <Input
          onChange={(event) => {
            onSearchChange(event.target.value)
          }}
          placeholder={t("search.attributes")}
          value={q}
        />
        <Select onValueChange={onStatusChange} value={status}>
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="active">{t("filters.activeOnly")}</Select.Item>
            <Select.Item value="all">{t("filters.allStatuses")}</Select.Item>
          </Select.Content>
        </Select>
      </div>
    </div>
  )
}

const AttributeTypesSection = () => {
  const { t } = useTranslation("brands")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [name, setName] = useState("")
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("active")
  const [isCheckingName, setIsCheckingName] = useState(false)
  const debouncedQ = useDebouncedValue(q)

  const params = {
    include_deleted: status === "all",
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
    order_by: "name",
    q: debouncedQ,
  }

  const { data, isLoading } = useQuery({
    queryFn: async () => await listBrandAttributeTypes(params),
    queryKey: brandQueryKeys.attributeTypes(params),
  })

  const createMutation = useMutation({
    mutationFn: createBrandAttributeType,
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.createAttributeFailed"),
      )
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypesLists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      setName("")
      if (response.action === "restored") {
        toast.success(t("toasts.attributeRestored"))
      } else if (response.action === "existing") {
        toast.success(t("toasts.attributeAlreadyExists"))
      } else {
        toast.success(t("toasts.attributeCreated"))
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBrandAttributeType,
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.deleteAttributeFailed"),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypesLists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      toast.success(t("toasts.attributeDeleted"))
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restoreBrandAttributeType,
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.restoreAttributeFailed"),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypesLists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      setName("")
      toast.success(t("toasts.attributeRestored"))
    },
  })

  const attributeTypes = data?.attribute_types ?? []
  const count = data?.count ?? 0

  const handleDelete = async (attributeType: BrandAttributeType) => {
    const usedText = attributeType.usage_count
      ? t("prompts.deleteAttributeUsage", {
          count: attributeType.usage_count,
        })
      : ""
    const confirmed = await prompt({
      cancelText: t(ACTION_CANCEL),
      confirmText: t(ACTION_DELETE),
      description: t("prompts.deleteAttributeDescription", {
        name: attributeType.name,
        usageText: usedText,
      }),
      title: t("prompts.deleteAttributeTitle"),
    })

    if (confirmed) {
      deleteMutation.mutate(attributeType.id)
    }
  }

  const handleCreate = async () => {
    const attributeName = name.trim()

    if (!attributeName) {
      return
    }

    setIsCheckingName(true)
    try {
      const existingResponse = await listBrandAttributeTypes({
        include_deleted: true,
        limit: 1,
        name: attributeName,
        offset: 0,
        order_by: "name",
      })
      const existing = existingResponse.attribute_types.find(
        (attributeType) => attributeType.name === attributeName,
      )

      if (existing !== undefined && hasTrimmedString(existing.deleted_at)) {
        const confirmed = await prompt({
          cancelText: t(ACTION_CANCEL),
          confirmText: t(ACTION_RESTORE),
          description: t("prompts.restoreAttributeDescription", {
            name: attributeName,
          }),
          title: t("prompts.restoreAttributeTitle"),
        })

        if (confirmed) {
          restoreMutation.mutate(existing.id)
        }
        return
      }

      if (existing !== undefined) {
        toast.error(t("toasts.attributeExistsError", { name: attributeName }))
        return
      }

      createMutation.mutate({ name: attributeName })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.checkAttributeFailed"),
      )
    } finally {
      setIsCheckingName(false)
    }
  }

  const columns = buildAttributeTypeColumns({
    isRowMutating: createRowMutationGuard(deleteMutation, restoreMutation),
    onDelete: (attributeType) => {
      void handleDelete(attributeType)
    },
    onRestore: (attributeTypeId) => {
      restoreMutation.mutate(attributeTypeId)
    },
    t,
  })

  return (
    <Container className="divide-y p-0">
      <AttributeTypesToolbar
        count={count}
        isCreating={
          createMutation.isPending ||
          restoreMutation.isPending ||
          isCheckingName
        }
        name={name}
        onCreate={() => {
          void handleCreate()
        }}
        onNameChange={(value) => {
          setName(value)
        }}
        onSearchChange={(value) => {
          setPageIndex(0)
          setQ(value)
        }}
        onStatusChange={(value) => {
          setPageIndex(0)
          setStatus(value)
        }}
        q={q}
        status={status}
      />
      <BrandDataTable
        columns={columns}
        count={count}
        data={attributeTypes}
        emptyState={{
          empty: {
            description: t("attributes.empty"),
            heading: t(ATTRIBUTES_TITLE),
          },
          filtered: {
            description: t("attributes.empty"),
            heading: t(ATTRIBUTES_TITLE),
          },
        }}
        getRowId={(attributeType) => attributeType.id}
        isLoading={isLoading}
        onPageIndexChange={setPageIndex}
        onRowClick={(_event, attributeType) => {
          navigate(`/brands/attributes/${attributeType.id}`)
        }}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
      />
    </Container>
  )
}

interface BrandsToolbarProps {
  count: number
  onCreate: () => void
  onOrderByChange: (value: string) => void
  onSearchChange: (value: string) => void
  onStatusChange: (value: string) => void
  orderBy: string
  q: string
  status: string
}

const BrandsToolbar = ({
  count,
  onCreate,
  onOrderByChange,
  onSearchChange,
  onStatusChange,
  orderBy,
  q,
  status,
}: BrandsToolbarProps) => {
  const { t } = useTranslation("brands")

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Heading level="h1">{t(BRANDS_TITLE)}</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            {t("brands.count", { count })}
          </Text>
        </div>
        <Button
          onClick={onCreate}
          size="small"
          type="button"
          variant="secondary"
        >
          {t("actions.create")}
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px]">
        <Input
          onChange={(event) => {
            onSearchChange(event.target.value)
          }}
          placeholder={t("search.brands")}
          value={q}
        />
        <Select onValueChange={onOrderByChange} value={orderBy}>
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
        <Select onValueChange={onStatusChange} value={status}>
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="active">{t("filters.activeOnly")}</Select.Item>
            <Select.Item value="all">{t("filters.allStatuses")}</Select.Item>
          </Select.Content>
        </Select>
      </div>
    </div>
  )
}

const BrandsPage = () => {
  const { i18n, t } = useTranslation("brands")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [createOpen, setCreateOpen] = useState(false)
  const [editingBrandId, setEditingBrandId] = useState<string | undefined>()
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

  const {
    data,
    error: listError,
    isLoading,
  } = useQuery({
    queryFn: async () => await listBrands(params),
    queryKey: brandQueryKeys.list(params),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : t("errors.deleteBrandFailed"),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      toast.success(t("toasts.brandDeleted"))
    },
  })

  const restoreMutation = useMutation({
    mutationFn: restoreBrand,
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : t("errors.restoreBrandFailed"),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.details(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      toast.success(t("toasts.brandRestored"))
    },
  })

  const brands = data?.brands ?? []
  const count = data?.count ?? 0
  const locale = formatLocaleCode(i18n.resolvedLanguage ?? i18n.language)
  const attributeTypesQuery = useQuery({
    queryFn: async () => await listBrandAttributeTypes(ATTRIBUTE_TYPES_PARAMS),
    queryKey: brandQueryKeys.attributeTypes(ATTRIBUTE_TYPES_PARAMS),
  })
  const attributeTypes = attributeTypesQuery.data?.attribute_types ?? []
  const editingBrandQuery = useQuery({
    enabled: hasTrimmedString(editingBrandId),
    queryFn: async () => {
      if (!hasTrimmedString(editingBrandId)) {
        throw new Error(t("errors.brandIdRequired"))
      }

      return await retrieveBrand(editingBrandId)
    },
    queryKey: brandQueryKeys.detail(editingBrandId),
  })
  const editingBrand = editingBrandQuery.data?.brand

  const handleDelete = async (brand: Brand) => {
    const activeProductText = brand.active_product_count
      ? t("prompts.deleteBrandProducts", {
          count: brand.active_product_count,
        })
      : ""
    const confirmed = await prompt({
      cancelText: t(ACTION_CANCEL),
      confirmText: t(ACTION_DELETE),
      description: t("prompts.deleteBrandDescription", {
        linkedText: activeProductText,
        title: brand.title,
      }),
      title: t("prompts.deleteBrandTitle"),
    })

    if (confirmed) {
      deleteMutation.mutate(brand.id)
    }
  }

  const handleRestore = (brand: Brand) => {
    restoreMutation.mutate(brand.id)
  }
  const columns = buildBrandColumns({
    isRowMutating: createRowMutationGuard(deleteMutation, restoreMutation),
    locale,
    onDelete: (brand) => {
      void handleDelete(brand)
    },
    onEdit: (brandId) => {
      setEditingBrandId(brandId)
    },
    onRestore: handleRestore,
    t,
  })

  return (
    <>
      <div className="flex flex-col gap-6">
        <Container className="divide-y p-0">
          <BrandsToolbar
            count={count}
            onCreate={() => {
              setCreateOpen(true)
            }}
            onOrderByChange={(value) => {
              setPageIndex(0)
              setOrderBy(value)
            }}
            onSearchChange={(value) => {
              setPageIndex(0)
              setQ(value)
            }}
            onStatusChange={(value) => {
              setPageIndex(0)
              setStatus(value)
            }}
            orderBy={orderBy}
            q={q}
            status={status}
          />

          {listError ? (
            <div className="px-6 py-4">
              <Alert variant="error">{t("errors.loadBrandsFailed")}</Alert>
            </div>
          ) : (
            <BrandDataTable
              columns={columns}
              count={count}
              data={brands}
              emptyState={{
                empty: {
                  description: t("brands.empty"),
                  heading: t(BRANDS_TITLE),
                },
                filtered: {
                  description: t("brands.empty"),
                  heading: t(BRANDS_TITLE),
                },
              }}
              getRowId={(brand) => brand.id}
              isLoading={isLoading}
              onPageIndexChange={setPageIndex}
              onRowClick={(_event, brand) => {
                navigate(`/brands/${brand.id}`)
              }}
              pageIndex={pageIndex}
              pageSize={PAGE_SIZE}
            />
          )}
        </Container>
        <AttributeTypesSection />
      </div>

      {createOpen ? (
        <BrandCreateModal
          attributeTypes={attributeTypes}
          onOpenChange={setCreateOpen}
          open={createOpen}
        />
      ) : null}
      {hasTrimmedString(editingBrandId) && editingBrand !== undefined ? (
        <BrandEditDrawer
          attributeTypes={attributeTypes}
          brand={editingBrand}
          onOpenChange={(open) => {
            if (!open) {
              setEditingBrandId(undefined)
            }
          }}
          open={editingBrand !== undefined}
        />
      ) : null}
    </>
  )
}

export const config = defineRouteConfig({
  icon: Buildings,
  label: "menuItem",
  translationNs: "brands",
})

export default BrandsPage
