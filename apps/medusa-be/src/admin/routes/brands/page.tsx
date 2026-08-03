import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings, PencilSquare, Trash } from "@medusajs/icons"
import {
  Alert,
  Button,
  Container,
  createDataTableColumnHelper,
  type DataTableColumnDef,
  Heading,
  Input,
  Select,
  StatusBadge,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { BrandDataTable } from "../../components/brands/brand-data-table"
import {
  BrandCreateModal,
  BrandEditDrawer,
} from "../../components/brands/brand-form"
import {
  type Brand,
  type BrandAttributeType,
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
import { translateBreadcrumb } from "../../lib/breadcrumb"
import { formatLocaleCode } from "../../lib/format-locale-code"
import { useDebouncedValue } from "../../lib/use-debounced-value"

const PAGE_SIZE = 20

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

const formatDate = (date: string | undefined, locale?: string) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const brandColumnHelper = createDataTableColumnHelper<Brand>()
const attributeTypeColumnHelper =
  createDataTableColumnHelper<BrandAttributeType>()

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
    queryFn: () => listBrandAttributeTypes(params),
    queryKey: brandQueryKeys.attributeTypes(params),
  })

  const createMutation = useMutation({
    mutationFn: createBrandAttributeType,
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.createAttributeFailed")
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
          : t("errors.deleteAttributeFailed")
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
          : t("errors.restoreAttributeFailed")
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
      cancelText: t("actions.cancel"),
      confirmText: t("actions.delete"),
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
        (attributeType) => attributeType.name === attributeName
      )

      if (existing?.deleted_at) {
        const confirmed = await prompt({
          cancelText: t("actions.cancel"),
          confirmText: t("actions.restore"),
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

      if (existing) {
        toast.error(t("toasts.attributeExistsError", { name: attributeName }))
        return
      }

      createMutation.mutate({ name: attributeName })
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.checkAttributeFailed")
      )
    } finally {
      setIsCheckingName(false)
    }
  }

  const columns: DataTableColumnDef<BrandAttributeType>[] = [
    attributeTypeColumnHelper.accessor("name", {
      header: t("columns.name"),
      cell: ({ row }) => (
        <Link to={`/brands/attributes/${row.original.id}`}>
          {row.original.name}
        </Link>
      ),
    }),
    attributeTypeColumnHelper.accessor("deleted_at", {
      header: t("columns.status"),
      cell: ({ row }) => (
        <StatusBadge color={row.original.deleted_at ? "red" : "green"}>
          {row.original.deleted_at ? t("status.deleted") : t("status.active")}
        </StatusBadge>
      ),
    }),
    attributeTypeColumnHelper.accessor("usage_count", {
      header: t("columns.usedBy"),
    }),
    attributeTypeColumnHelper.action({
      actions: ({ row }) => {
        const mutationPending =
          (deleteMutation.isPending &&
            deleteMutation.variables === row.original.id) ||
          (restoreMutation.isPending &&
            restoreMutation.variables === row.original.id)

        if (mutationPending) {
          return []
        }

        return row.original.deleted_at
          ? [
              {
                label: t("actions.restore"),
                onClick: () => restoreMutation.mutate(row.original.id),
              },
            ]
          : [
              {
                icon: <Trash />,
                label: t("actions.delete"),
                onClick: () => handleDelete(row.original),
              },
            ]
      },
    }),
  ]

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <Heading level="h2">{t("attributes.title")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("attributes.count", { count })}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Input
              onChange={(event) => setName(event.target.value)}
              placeholder={t("attributes.newPlaceholder")}
              value={name}
            />
            <Button
              disabled={!name.trim()}
              isLoading={
                createMutation.isPending ||
                restoreMutation.isPending ||
                isCheckingName
              }
              onClick={handleCreate}
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
              setPageIndex(0)
              setQ(event.target.value)
            }}
            placeholder={t("search.attributes")}
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
      </div>
      <BrandDataTable
        columns={columns}
        count={count}
        data={attributeTypes}
        emptyState={{
          empty: {
            description: t("attributes.empty"),
            heading: t("attributes.title"),
          },
          filtered: {
            description: t("attributes.empty"),
            heading: t("attributes.title"),
          },
        }}
        getRowId={(attributeType) => attributeType.id}
        isLoading={isLoading}
        onPageIndexChange={setPageIndex}
        onRowClick={(_event, attributeType) =>
          navigate(`/brands/attributes/${attributeType.id}`)
        }
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
      />
    </Container>
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
    queryFn: () => listBrands(params),
    queryKey: brandQueryKeys.list(params),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBrand,
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : t("errors.deleteBrandFailed")
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
          : t("errors.restoreBrandFailed")
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
  const attributeTypesParams = {
    include_deleted: true,
    limit: 100,
    offset: 0,
    order_by: "name",
  }
  const attributeTypesQuery = useQuery({
    queryFn: () => listBrandAttributeTypes(attributeTypesParams),
    queryKey: brandQueryKeys.attributeTypes(attributeTypesParams),
  })
  const attributeTypes = attributeTypesQuery.data?.attribute_types ?? []
  const editingBrandQuery = useQuery({
    enabled: !!editingBrandId,
    queryFn: () => {
      if (!editingBrandId) {
        throw new Error(t("errors.brandIdRequired"))
      }

      return retrieveBrand(editingBrandId)
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
      cancelText: t("actions.cancel"),
      confirmText: t("actions.delete"),
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
  const columns: DataTableColumnDef<Brand>[] = [
    brandColumnHelper.accessor("title", {
      header: t("columns.title"),
      cell: ({ row }) => (
        <Link to={`/brands/${row.original.id}`}>{row.original.title}</Link>
      ),
    }),
    brandColumnHelper.accessor("handle", {
      header: t("columns.handle"),
    }),
    brandColumnHelper.accessor((brand) => brand.attributes.length, {
      header: t("columns.attributes"),
      id: "attributes",
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
    brandColumnHelper.action({
      actions: ({ row }) => {
        const mutationPending =
          (deleteMutation.isPending &&
            deleteMutation.variables === row.original.id) ||
          (restoreMutation.isPending &&
            restoreMutation.variables === row.original.id)

        if (mutationPending) {
          return []
        }

        return row.original.deleted_at
          ? [
              {
                label: t("actions.restore"),
                onClick: () => handleRestore(row.original),
              },
            ]
          : [
              {
                icon: <PencilSquare />,
                label: t("actions.edit"),
                onClick: () => setEditingBrandId(row.original.id),
              },
              {
                icon: <Trash />,
                label: t("actions.delete"),
                onClick: () => handleDelete(row.original),
              },
            ]
      },
    }),
  ]

  return (
    <>
      <div className="flex flex-col gap-6">
        <Container className="divide-y p-0">
          <div className="flex flex-col gap-4 px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Heading level="h1">{t("brands.title")}</Heading>
                <Text className="text-ui-fg-subtle" size="small">
                  {t("brands.count", { count })}
                </Text>
              </div>
              <Button
                onClick={() => setCreateOpen(true)}
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
      {editingBrandId && editingBrand ? (
        <BrandEditDrawer
          attributeTypes={attributeTypes}
          brand={editingBrand}
          onOpenChange={(open) => {
            if (!open) {
              setEditingBrandId(undefined)
            }
          }}
          open={!!editingBrand}
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
