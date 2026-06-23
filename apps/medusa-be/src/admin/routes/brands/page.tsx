import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Buildings, PencilSquare, Trash } from "@medusajs/icons"
import {
  Button,
  Checkbox,
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
  toast,
  usePrompt,
} from "@medusajs/ui"
import {
  type UseMutationResult,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"
import {
  type Brand,
  type BrandAttribute,
  type BrandAttributeType,
  type BrandInput,
  brandQueryKeys,
  createBrand,
  createBrandAttributeType,
  deleteBrand,
  deleteBrandAttributeType,
  listBrandAttributeTypes,
  listBrands,
  restoreBrand,
  restoreBrandAttributeType,
  retrieveBrand,
  updateBrand,
} from "../../lib/brands"
import { translateBreadcrumb } from "../../lib/breadcrumb"
import { formatLocaleCode } from "../../lib/format-locale-code"
import {
  getPaginationTranslations,
  onRowKeyboardActivate,
} from "../../lib/table"
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

const emptyAttribute = (
  attributeTypes: BrandAttributeType[] = [],
  selectedNames = new Set<string>()
): BrandAttribute => ({
  name:
    attributeTypes.find(
      (attributeType) =>
        !(attributeType.deleted_at || selectedNames.has(attributeType.name))
    )?.name ?? "",
  value: "",
})

const toFormState = (brand?: Brand): BrandInput => ({
  attributes: brand?.attributes.length
    ? brand.attributes.filter(
        (attribute) => !attribute.attribute_type_deleted_at
      )
    : [],
  gpsrContactEmail: brand?.gpsrContactEmail ?? "",
  gpsrEuropeanResellerContactEmail:
    brand?.gpsrEuropeanResellerContactEmail ?? "",
  gpsrEuropeanResellerManufacturingCompanyName:
    brand?.gpsrEuropeanResellerManufacturingCompanyName ?? "",
  gpsrEuropeanResellerPostalAddress:
    brand?.gpsrEuropeanResellerPostalAddress ?? "",
  gpsrManufacturedOutsideEu: brand?.gpsrManufacturedOutsideEu ?? false,
  gpsrManufacturingCompanyName: brand?.gpsrManufacturingCompanyName ?? "",
  gpsrPostalAddress: brand?.gpsrPostalAddress ?? "",
  handle: brand?.handle ?? "",
  title: brand?.title ?? "",
})

const optionalTrimmed = (value?: string) => {
  const trimmed = value?.trim()

  return trimmed ? trimmed : undefined
}

const toDefaultHandle = (title: string) =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")

const formatDate = (date: string | undefined, locale?: string) => {
  if (!date) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date))
}

const BrandRows = ({
  deleteMutation,
  isLoading,
  onDelete,
  onEdit,
  onOpen,
  onRestore,
  brands,
}: {
  deleteMutation: UseMutationResult<unknown, Error, string>
  isLoading: boolean
  onDelete: (brand: Brand) => void
  onEdit: (brand: Brand) => void
  onOpen: (brand: Brand) => void
  onRestore: (brand: Brand) => void
  brands: Brand[]
}) => {
  const { i18n, t } = useTranslation("brands")
  const locale = formatLocaleCode(i18n.resolvedLanguage ?? i18n.language)

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

  if (!brands.length) {
    return (
      <Table.Row>
        <Table.Cell>{t("brands.empty")}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return brands.map((brand) => (
    <Table.Row
      aria-label={brand.title}
      className="cursor-pointer"
      key={brand.id}
      onClick={() => onOpen(brand)}
      onKeyDown={onRowKeyboardActivate(() => onOpen(brand))}
      role="button"
      tabIndex={0}
    >
      <Table.Cell>{brand.title}</Table.Cell>
      <Table.Cell className="text-ui-fg-subtle">{brand.handle}</Table.Cell>
      <Table.Cell>{brand.attributes.length}</Table.Cell>
      <Table.Cell>{brand.active_product_count}</Table.Cell>
      <Table.Cell>
        <StatusBadge color={brand.deleted_at ? "red" : "green"}>
          {brand.deleted_at ? t("status.deleted") : t("status.active")}
        </StatusBadge>
      </Table.Cell>
      <Table.Cell>{formatDate(brand.updated_at, locale)}</Table.Cell>
      <Table.Cell>
        <div className="flex justify-end gap-1">
          {brand.deleted_at ? (
            <Button
              onClick={(event) => {
                event.stopPropagation()
                onRestore(brand)
              }}
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
                onClick={(event) => {
                  event.stopPropagation()
                  onEdit(brand)
                }}
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
                  deleteMutation.variables === brand.id
                }
                onClick={(event) => {
                  event.stopPropagation()
                  onDelete(brand)
                }}
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

const BrandFormDrawer = ({
  attributeTypes,
  onOpenChange,
  open,
  brand,
}: {
  attributeTypes: BrandAttributeType[]
  onOpenChange: (open: boolean) => void
  open: boolean
  brand?: Brand
}) => {
  const { t } = useTranslation("brands")
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [form, setForm] = useState<BrandInput>(() => toFormState(brand))

  useEffect(() => {
    if (open) {
      setForm(toFormState(brand))
    }
  }, [brand, open])

  const mutation = useMutation({
    mutationFn: async (input: BrandInput) => {
      if (brand) {
        return updateBrand(brand.id, input)
      }

      const resolvedHandle = input.handle ?? toDefaultHandle(input.title)
      const existingResponse = await listBrands({
        handle: resolvedHandle,
        include_deleted: true,
        limit: 1,
        offset: 0,
        order_by: "title",
      })
      const existing = existingResponse.brands.find(
        (candidate) => candidate.handle === resolvedHandle
      )

      if (existing?.deleted_at) {
        const confirmed = await prompt({
          cancelText: t("actions.cancel"),
          confirmText: t("actions.restore"),
          description: t("prompts.restoreBrandDescription", {
            handle: resolvedHandle,
            title: existing.title,
          }),
          title: t("prompts.restoreBrandTitle"),
        })

        if (!confirmed) {
          return null
        }

        await restoreBrand(existing.id)
        const response = await updateBrand(existing.id, {
          ...input,
          handle: resolvedHandle,
        })

        return { ...response, action: "restored" as const }
      }

      if (existing) {
        throw new Error(
          t("toasts.brandExistsError", { handle: resolvedHandle })
        )
      }

      const response = await createBrand({
        ...input,
        handle: resolvedHandle,
      })

      return { ...response, action: "created" as const }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveBrandFailed")
      )
    },
    onSuccess: async (response) => {
      if (!response) {
        return
      }

      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.lists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypesLists(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.attributeTypeDetails(),
      })
      await queryClient.invalidateQueries({
        queryKey: brandQueryKeys.detail(response.brand.id),
      })
      if (response.action === "restored") {
        toast.success(t("toasts.brandReactivated"))
      } else {
        toast.success(
          brand ? t("toasts.brandUpdated") : t("toasts.brandCreated")
        )
      }
      onOpenChange(false)
    },
  })

  const updateAttribute = (
    index: number,
    key: keyof BrandAttribute,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, currentIndex) =>
        currentIndex === index ? { ...attribute, [key]: value } : attribute
      ),
    }))
  }

  const getAttributeOptions = (selectedName: string) => {
    const selectedNames = new Set(
      form.attributes
        .map((attribute) => attribute.name)
        .filter((name) => name && name !== selectedName)
    )

    return attributeTypes.filter(
      (attributeType) =>
        !(attributeType.deleted_at || selectedNames.has(attributeType.name))
    )
  }
  const selectedAttributeNames = new Set(
    form.attributes
      .map((attribute) => attribute.name)
      .filter((name): name is string => !!name)
  )
  const canAddAttribute = attributeTypes.some(
    (attributeType) =>
      !(
        attributeType.deleted_at ||
        selectedAttributeNames.has(attributeType.name)
      )
  )

  const save = () => {
    const attributes = form.attributes
      .map((attribute) => ({
        name: attribute.name.trim(),
        value: attribute.value,
      }))
      .filter((attribute) => attribute.name.length > 0)

    mutation.mutate({
      attributes,
      gpsrContactEmail: optionalTrimmed(form.gpsrContactEmail),
      gpsrEuropeanResellerContactEmail: optionalTrimmed(
        form.gpsrEuropeanResellerContactEmail
      ),
      gpsrEuropeanResellerManufacturingCompanyName: optionalTrimmed(
        form.gpsrEuropeanResellerManufacturingCompanyName
      ),
      gpsrEuropeanResellerPostalAddress: optionalTrimmed(
        form.gpsrEuropeanResellerPostalAddress
      ),
      gpsrManufacturedOutsideEu: form.gpsrManufacturedOutsideEu,
      gpsrManufacturingCompanyName: optionalTrimmed(
        form.gpsrManufacturingCompanyName
      ),
      gpsrPostalAddress: optionalTrimmed(form.gpsrPostalAddress),
      handle: optionalTrimmed(form.handle),
      title: form.title.trim(),
    })
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>
            {brand ? t("form.editBrand") : t("form.createBrand")}
          </Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-6 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label htmlFor="brand-title">{t("fields.title")}</Label>
            <Input
              id="brand-title"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              value={form.title}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="brand-handle">{t("fields.handle")}</Label>
            <Input
              id="brand-handle"
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  handle: event.target.value,
                }))
              }
              placeholder={t("form.handlePlaceholder")}
              value={form.handle}
            />
          </div>
          <div className="flex flex-col gap-3">
            <Heading level="h2">GPSR</Heading>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-manufacturing-company-name">
                  {t("fields.gpsrManufacturingCompanyName")}
                </Label>
                <Input
                  id="brand-gpsr-manufacturing-company-name"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrManufacturingCompanyName: event.target.value,
                    }))
                  }
                  value={form.gpsrManufacturingCompanyName}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-postal-address">
                  {t("fields.gpsrPostalAddress")}
                </Label>
                <Input
                  id="brand-gpsr-postal-address"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrPostalAddress: event.target.value,
                    }))
                  }
                  value={form.gpsrPostalAddress}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-contact-email">
                  {t("fields.gpsrContactEmail")}
                </Label>
                <Input
                  id="brand-gpsr-contact-email"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrContactEmail: event.target.value,
                    }))
                  }
                  type="email"
                  value={form.gpsrContactEmail}
                />
              </div>
              <div className="flex items-center gap-3 rounded-md border border-ui-border-base px-3 py-2">
                <Checkbox
                  checked={form.gpsrManufacturedOutsideEu}
                  id="brand-gpsr-manufactured-outside-eu"
                  onCheckedChange={(checked) =>
                    setForm((current) => ({
                      ...current,
                      gpsrManufacturedOutsideEu: checked === true,
                    }))
                  }
                />
                <Label htmlFor="brand-gpsr-manufactured-outside-eu">
                  {t("fields.gpsrManufacturedOutsideEu")}
                </Label>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-eu-company-name">
                  {t("fields.gpsrEuropeanResellerManufacturingCompanyName")}
                </Label>
                <Input
                  id="brand-gpsr-eu-company-name"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrEuropeanResellerManufacturingCompanyName:
                        event.target.value,
                    }))
                  }
                  value={form.gpsrEuropeanResellerManufacturingCompanyName}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="brand-gpsr-eu-address">
                  {t("fields.gpsrEuropeanResellerPostalAddress")}
                </Label>
                <Input
                  id="brand-gpsr-eu-address"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrEuropeanResellerPostalAddress: event.target.value,
                    }))
                  }
                  value={form.gpsrEuropeanResellerPostalAddress}
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <Label htmlFor="brand-gpsr-eu-email">
                  {t("fields.gpsrEuropeanResellerContactEmail")}
                </Label>
                <Input
                  id="brand-gpsr-eu-email"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      gpsrEuropeanResellerContactEmail: event.target.value,
                    }))
                  }
                  type="email"
                  value={form.gpsrEuropeanResellerContactEmail}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Heading level="h2">{t("attributes.title")}</Heading>
              <Button
                disabled={!canAddAttribute}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    attributes: [
                      ...current.attributes,
                      emptyAttribute(attributeTypes, selectedAttributeNames),
                    ],
                  }))
                }
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.add")}
              </Button>
            </div>
            {form.attributes.length ? (
              form.attributes.map((attribute, index) => (
                <div
                  className="grid grid-cols-[1fr_1fr_auto] gap-2"
                  key={`${attribute.id ?? "new"}-${index}`}
                >
                  <Select
                    onValueChange={(value) =>
                      updateAttribute(index, "name", value)
                    }
                    value={attribute.name}
                  >
                    <Select.Trigger>
                      <Select.Value placeholder={t("fields.attribute")} />
                    </Select.Trigger>
                    <Select.Content>
                      {getAttributeOptions(attribute.name).map(
                        (attributeType) => (
                          <Select.Item
                            key={attributeType.id}
                            value={attributeType.name}
                          >
                            {attributeType.name}
                          </Select.Item>
                        )
                      )}
                    </Select.Content>
                  </Select>
                  <Input
                    onChange={(event) =>
                      updateAttribute(index, "value", event.target.value)
                    }
                    placeholder={t("fields.value")}
                    value={attribute.value}
                  />
                  <IconButton
                    aria-label={t("actions.remove")}
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        attributes: current.attributes.filter(
                          (_, currentIndex) => currentIndex !== index
                        ),
                      }))
                    }
                    type="button"
                    variant="transparent"
                  >
                    <Trash />
                  </IconButton>
                </div>
              ))
            ) : (
              <Text className="text-ui-fg-subtle" size="small">
                {t("attributes.empty")}
              </Text>
            )}
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-2">
            <Button
              onClick={() => onOpenChange(false)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={!form.title.trim()}
              isLoading={mutation.isPending}
              onClick={save}
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
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

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

  const renderAttributeRows = () => {
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

    if (!attributeTypes.length) {
      return (
        <Table.Row>
          <Table.Cell>{t("attributes.empty")}</Table.Cell>
          <Table.Cell />
          <Table.Cell />
          <Table.Cell />
        </Table.Row>
      )
    }

    return attributeTypes.map((attributeType) => (
      <Table.Row
        aria-label={attributeType.name}
        className="cursor-pointer"
        key={attributeType.id}
        onClick={() => navigate(`/brands/attributes/${attributeType.id}`)}
        onKeyDown={onRowKeyboardActivate(() =>
          navigate(`/brands/attributes/${attributeType.id}`)
        )}
        role="button"
        tabIndex={0}
      >
        <Table.Cell>{attributeType.name}</Table.Cell>
        <Table.Cell>
          <StatusBadge color={attributeType.deleted_at ? "red" : "green"}>
            {attributeType.deleted_at
              ? t("status.deleted")
              : t("status.active")}
          </StatusBadge>
        </Table.Cell>
        <Table.Cell>{attributeType.usage_count}</Table.Cell>
        <Table.Cell>
          <div className="flex justify-end">
            {attributeType.deleted_at ? (
              <Button
                isLoading={
                  restoreMutation.isPending &&
                  restoreMutation.variables === attributeType.id
                }
                onClick={(event) => {
                  event.stopPropagation()
                  restoreMutation.mutate(attributeType.id)
                }}
                size="small"
                type="button"
                variant="secondary"
              >
                {t("actions.restore")}
              </Button>
            ) : (
              <IconButton
                aria-label={t("actions.delete")}
                disabled={
                  deleteMutation.isPending &&
                  deleteMutation.variables === attributeType.id
                }
                onClick={(event) => {
                  event.stopPropagation()
                  handleDelete(attributeType)
                }}
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
    ))
  }

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
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("columns.name")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.usedBy")}</Table.HeaderCell>
            <Table.HeaderCell className="w-[1%] text-right">
              {t("columns.actions")}
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>{renderAttributeRows()}</Table.Body>
      </Table>
      <Table.Pagination
        canNextPage={pageIndex + 1 < pageCount}
        canPreviousPage={pageIndex > 0}
        count={count}
        nextPage={() => setPageIndex((current) => current + 1)}
        pageCount={pageCount}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        previousPage={() => setPageIndex((current) => Math.max(current - 1, 0))}
        translations={getPaginationTranslations(t)}
      />
    </Container>
  )
}

const BrandsPage = () => {
  const { t } = useTranslation("brands")
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

  const params = useMemo(
    () => ({
      include_deleted: status === "all",
      limit: PAGE_SIZE,
      offset: pageIndex * PAGE_SIZE,
      order_by: orderBy,
      q: debouncedQ,
    }),
    [debouncedQ, orderBy, pageIndex, status]
  )

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
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)
  const attributeTypesParams = useMemo(
    () => ({
      include_deleted: true,
      limit: 100,
      offset: 0,
      order_by: "name",
    }),
    []
  )
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
              <Text className="text-ui-fg-error">
                {t("errors.loadBrandsFailed")}
              </Text>
            </div>
          ) : (
            <>
              <Table>
                <Table.Header>
                  <Table.Row>
                    <Table.HeaderCell>{t("columns.title")}</Table.HeaderCell>
                    <Table.HeaderCell>{t("columns.handle")}</Table.HeaderCell>
                    <Table.HeaderCell>
                      {t("columns.attributes")}
                    </Table.HeaderCell>
                    <Table.HeaderCell>{t("columns.products")}</Table.HeaderCell>
                    <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
                    <Table.HeaderCell>{t("columns.updated")}</Table.HeaderCell>
                    <Table.HeaderCell className="w-[1%] text-right">
                      {t("columns.actions")}
                    </Table.HeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  <BrandRows
                    brands={brands}
                    deleteMutation={deleteMutation}
                    isLoading={isLoading}
                    onDelete={handleDelete}
                    onEdit={(brand) => setEditingBrandId(brand.id)}
                    onOpen={(brand) => navigate(`/brands/${brand.id}`)}
                    onRestore={handleRestore}
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
            </>
          )}
        </Container>
        <AttributeTypesSection />
      </div>

      {createOpen ? (
        <BrandFormDrawer
          attributeTypes={attributeTypes}
          onOpenChange={setCreateOpen}
          open={createOpen}
        />
      ) : null}
      {editingBrandId && editingBrand ? (
        <BrandFormDrawer
          attributeTypes={attributeTypes}
          brand={editingBrand}
          onOpenChange={(open) => {
            if (!open) {
              setEditingBrandId(undefined)
            }
          }}
          open={!!editingBrandId && !!editingBrand}
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
