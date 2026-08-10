import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ArrowUpRightOnBox, PencilSquare, Tag, Trash } from "@medusajs/icons"
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
  Switch,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import type { QueryClient } from "@tanstack/react-query"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { ComponentProps } from "react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import {
  createProductAttributeDefinition,
  createProductAttributeOption,
  deleteProductAttributeDefinition,
  deleteProductAttributeOption,
  listProductAttributeDefinitions,
  listProductAttributeOptionAssignedProducts,
  listProductAttributeOptions,
  permanentlyDeleteProductAttributeDefinition,
  permanentlyDeleteProductAttributeOption,
  productAttributeQueryKeys,
  restoreProductAttributeDefinition,
  restoreProductAttributeOption,
  updateProductAttributeDefinition,
  updateProductAttributeOption,
} from "../../../lib/product-attributes"
import type {
  ProductAttributeDefinition,
  ProductAttributeInputType,
  ProductAttributeOption,
  ProductAttributeStatus,
} from "../../../lib/product-attributes"
import { getPaginationTranslations } from "../../../lib/table"
import { useDebouncedValue } from "../../../lib/use-debounced-value"

const PAGE_SIZE = 20
const ACTION_CANCEL = "actions.cancel"
const ACTION_DELETE = "actions.delete"
const ACTION_DELETE_PERMANENTLY = "actions.deletePermanently"
const ACTION_EDIT = "actions.edit"
const ACTION_SAVE = "actions.save"
const ERROR_DELETE_FAILED = "errors.deleteFailed"
const ERROR_SAVE_FAILED = "errors.saveFailed"
const FIELD_KEY = "fields.key"
const FIELD_LABEL = "fields.label"
const STATUS_LOADING = "status.loading"
const TOAST_DELETED = "toasts.deleted"

const mutationError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const isProductAttributeInputType = (
  value: string,
): value is ProductAttributeInputType => value === "select" || value === "text"

const isProductAttributeStatus = (
  value: string,
): value is ProductAttributeStatus =>
  value === "active" || value === "all" || value === "deleted"

const invalidateProductAttributeQueries = async (queryClient: QueryClient) => {
  await queryClient.invalidateQueries({
    queryKey: productAttributeQueryKeys.products(),
  })
}

const DefinitionCreateModal = ({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) => {
  const { t } = useTranslation("productAttributes")
  const queryClient = useQueryClient()
  const [key, setKey] = useState("")
  const [label, setLabel] = useState("")
  const [inputType, setInputType] = useState<ProductAttributeInputType>("text")
  const [isPublic, setIsPublic] = useState(false)
  const mutation = useMutation({
    mutationFn: createProductAttributeDefinition,
    onError: (error) => toast.error(mutationError(error, t(ERROR_SAVE_FAILED))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: productAttributeQueryKeys.definitionLists(),
      })
      toast.success(t("toasts.created"))
      onOpenChange(false)
    },
  })

  const handleSubmit: ComponentProps<"form">["onSubmit"] = (event) => {
    event.preventDefault()
    mutation.mutate({
      input_type: inputType,
      is_public: isPublic,
      key: key.trim(),
      label: label.trim(),
    })
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
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-attribute-label">
                  {t(FIELD_LABEL)}
                </Label>
                <Input
                  id="product-attribute-label"
                  onChange={(event) => {
                    setLabel(event.target.value)
                  }}
                  placeholder={t("placeholders.label")}
                  required
                  value={label}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="product-attribute-key">{t(FIELD_KEY)}</Label>
                <Input
                  id="product-attribute-key"
                  onChange={(event) => {
                    setKey(event.target.value)
                  }}
                  placeholder={t("placeholders.key")}
                  required
                  value={key}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>{t("fields.inputType")}</Label>
                <Select
                  onValueChange={(value) => {
                    if (isProductAttributeInputType(value)) {
                      setInputType(value)
                    }
                  }}
                  value={inputType}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="text">{t("types.text")}</Select.Item>
                    <Select.Item value="select">
                      {t("types.select")}
                    </Select.Item>
                  </Select.Content>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="product-attribute-public">
                  {t("fields.isPublic")}
                </Label>
                <Switch
                  checked={isPublic}
                  id="product-attribute-public"
                  onCheckedChange={setIsPublic}
                />
              </div>
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <Button
              onClick={() => {
                onOpenChange(false)
              }}
              type="button"
              variant="secondary"
            >
              {t(ACTION_CANCEL)}
            </Button>
            <Button
              disabled={!(key.trim() && label.trim())}
              isLoading={mutation.isPending}
              type="submit"
            >
              {t(ACTION_SAVE)}
            </Button>
          </FocusModal.Footer>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}

const OptionEditDrawer = ({
  onOpenChange,
  option,
}: {
  onOpenChange: (open: boolean) => void
  option: ProductAttributeOption
}) => {
  const { t } = useTranslation("productAttributes")
  const queryClient = useQueryClient()
  const [label, setLabel] = useState(option.label)
  const [productPage, setProductPage] = useState(0)
  const [productQ, setProductQ] = useState("")
  const debouncedProductQ = useDebouncedValue(productQ)
  const productParams = {
    limit: PAGE_SIZE,
    offset: productPage * PAGE_SIZE,
    order: "title",
    q: debouncedProductQ,
  }
  const productsQuery = useQuery({
    queryFn: async () =>
      await listProductAttributeOptionAssignedProducts(
        option.id,
        productParams,
      ),
    queryKey: productAttributeQueryKeys.optionProducts(
      option.id,
      productParams,
    ),
  })
  const mutation = useMutation({
    mutationFn: async () =>
      await updateProductAttributeOption(option.id, { label: label.trim() }),
    onError: (error) => toast.error(mutationError(error, t(ERROR_SAVE_FAILED))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: productAttributeQueryKeys.optionLists(option.definition_id),
      })
      toast.success(t("toasts.saved"))
      onOpenChange(false)
    },
  })
  const products = productsQuery.data?.products ?? []
  const productCount = productsQuery.data?.count ?? 0
  const productPageCount = Math.max(Math.ceil(productCount / PAGE_SIZE), 1)

  return (
    <Drawer onOpenChange={onOpenChange} open>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t(ACTION_EDIT)}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label>{t(FIELD_KEY)}</Label>
            <Input disabled value={option.key} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="product-attribute-option-label">
              {t(FIELD_LABEL)}
            </Label>
            <Input
              id="product-attribute-option-label"
              onChange={(event) => {
                setLabel(event.target.value)
              }}
              value={label}
            />
          </div>
          <div className="flex flex-col gap-3 border-t pt-4">
            <div>
              <Text size="small" weight="plus">
                {t("options.assignedProducts")}
              </Text>
              <Text className="text-ui-fg-subtle" size="small">
                {t("options.assignedProductsDescription")}
              </Text>
            </div>
            <Input
              aria-label={t("placeholders.productSearch")}
              onChange={(event) => {
                setProductPage(0)
                setProductQ(event.target.value)
              }}
              placeholder={t("placeholders.productSearch")}
              value={productQ}
            />
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>{t("columns.product")}</Table.HeaderCell>
                  <Table.HeaderCell>{t("columns.handle")}</Table.HeaderCell>
                  <Table.HeaderCell />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {productsQuery.isLoading ? (
                  <Table.Row>
                    <Table.Cell>{t(STATUS_LOADING)}</Table.Cell>
                    <Table.Cell />
                    <Table.Cell />
                  </Table.Row>
                ) : null}
                {productsQuery.error ? (
                  <Table.Row>
                    <Table.Cell className="text-ui-fg-error">
                      {t("errors.loadProductsFailed")}
                    </Table.Cell>
                    <Table.Cell />
                    <Table.Cell />
                  </Table.Row>
                ) : null}
                {productsQuery.isLoading ||
                productsQuery.error ||
                products.length > 0 ? null : (
                  <Table.Row>
                    <Table.Cell>{t("options.noProducts")}</Table.Cell>
                    <Table.Cell />
                    <Table.Cell />
                  </Table.Row>
                )}
                {products.map((product) => (
                  <Table.Row key={product.id}>
                    <Table.Cell>{product.title ?? product.id}</Table.Cell>
                    <Table.Cell className="text-ui-fg-subtle">
                      {product.handle ?? "-"}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">
                        <Button
                          asChild
                          size="small"
                          type="button"
                          variant="secondary"
                        >
                          <Link to={`/products/${product.id}`}>
                            <ArrowUpRightOnBox />
                            {t("actions.view")}
                          </Link>
                        </Button>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
            <Table.Pagination
              canNextPage={productPage + 1 < productPageCount}
              canPreviousPage={productPage > 0}
              count={productCount}
              nextPage={() => {
                setProductPage((current) => current + 1)
              }}
              pageCount={productPageCount}
              pageIndex={productPage}
              pageSize={PAGE_SIZE}
              previousPage={() => {
                setProductPage((current) => Math.max(current - 1, 0))
              }}
              translations={getPaginationTranslations(t)}
            />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            onClick={() => {
              onOpenChange(false)
            }}
            type="button"
            variant="secondary"
          >
            {t(ACTION_CANCEL)}
          </Button>
          <Button
            disabled={!label.trim()}
            isLoading={mutation.isPending}
            onClick={() => {
              mutation.mutate()
            }}
            type="button"
          >
            {t(ACTION_SAVE)}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

interface DefinitionOptionsTableProps {
  onDelete: (option: ProductAttributeOption) => void
  onEdit: (option: ProductAttributeOption) => void
  onPermanentDelete: (option: ProductAttributeOption) => void
  onPageChange: (page: number | ((current: number) => number)) => void
  onRestore: (id: string) => void
  optionCount: number
  optionPage: number
  options: ProductAttributeOption[]
  isLoading: boolean
  permanentlyDeleting: boolean
  restoring: boolean
}

const DefinitionOptionsTable = ({
  isLoading,
  onDelete,
  onEdit,
  onPageChange,
  onPermanentDelete,
  onRestore,
  optionCount,
  optionPage,
  options,
  permanentlyDeleting,
  restoring,
}: DefinitionOptionsTableProps) => {
  const { t } = useTranslation("productAttributes")
  const optionPageCount = Math.max(Math.ceil(optionCount / PAGE_SIZE), 1)

  return (
    <>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("columns.label")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.key")}</Table.HeaderCell>
            <Table.HeaderCell>{t("columns.usedBy")}</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {isLoading ? (
            <Table.Row>
              <Table.Cell>{t(STATUS_LOADING)}</Table.Cell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
          ) : null}
          {isLoading
            ? null
            : options.map((option) => (
                <Table.Row key={option.id}>
                  <Table.Cell>{option.label}</Table.Cell>
                  <Table.Cell className="text-ui-fg-subtle">
                    {option.key}
                  </Table.Cell>
                  <Table.Cell>{option.usage_count}</Table.Cell>
                  <Table.Cell>
                    <div className="flex justify-end gap-1">
                      {option.deleted_at !== null &&
                      option.deleted_at !== undefined ? (
                        <>
                          <Button
                            disabled={permanentlyDeleting}
                            isLoading={restoring}
                            onClick={() => {
                              onRestore(option.id)
                            }}
                            size="small"
                            type="button"
                            variant="secondary"
                          >
                            {t("actions.restore")}
                          </Button>
                          <IconButton
                            aria-label={t(ACTION_DELETE_PERMANENTLY)}
                            disabled={restoring || permanentlyDeleting}
                            onClick={() => {
                              onPermanentDelete(option)
                            }}
                            size="small"
                            variant="transparent"
                          >
                            <Trash />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <IconButton
                            aria-label={t(ACTION_EDIT)}
                            onClick={() => {
                              onEdit(option)
                            }}
                            size="small"
                            variant="transparent"
                          >
                            <PencilSquare />
                          </IconButton>
                          <IconButton
                            aria-label={t(ACTION_DELETE)}
                            onClick={() => {
                              onDelete(option)
                            }}
                            size="small"
                            variant="transparent"
                          >
                            <Trash />
                          </IconButton>
                        </>
                      )}
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
          {isLoading || options.length > 0 ? null : (
            <Table.Row>
              <Table.Cell>{t("options.empty")}</Table.Cell>
              <Table.Cell />
              <Table.Cell />
              <Table.Cell />
            </Table.Row>
          )}
        </Table.Body>
      </Table>
      <Table.Pagination
        canNextPage={optionPage + 1 < optionPageCount}
        canPreviousPage={optionPage > 0}
        count={optionCount}
        nextPage={() => {
          onPageChange((current) => current + 1)
        }}
        pageCount={optionPageCount}
        pageIndex={optionPage}
        pageSize={PAGE_SIZE}
        previousPage={() => {
          onPageChange((current) => Math.max(current - 1, 0))
        }}
        translations={getPaginationTranslations(t)}
      />
    </>
  )
}

const DefinitionOptions = ({
  definition,
}: {
  definition: ProductAttributeDefinition
}) => {
  const { t } = useTranslation("productAttributes")
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [optionKey, setOptionKey] = useState("")
  const [optionLabel, setOptionLabel] = useState("")
  const [optionPage, setOptionPage] = useState(0)
  const [optionQ, setOptionQ] = useState("")
  const [optionStatus, setOptionStatus] =
    useState<ProductAttributeStatus>("active")
  const [editingOption, setEditingOption] = useState<
    ProductAttributeOption | undefined
  >()
  const debouncedOptionQ = useDebouncedValue(optionQ)
  const optionParams = {
    limit: PAGE_SIZE,
    offset: optionPage * PAGE_SIZE,
    order: "label",
    q: debouncedOptionQ,
    status: optionStatus,
  }
  const optionsQuery = useQuery({
    queryFn: async () =>
      await listProductAttributeOptions(definition.id, optionParams),
    queryKey: productAttributeQueryKeys.options(definition.id, optionParams),
  })
  const invalidateOptions = async () => {
    await queryClient.invalidateQueries({
      queryKey: productAttributeQueryKeys.optionLists(definition.id),
    })
  }
  const createOptionMutation = useMutation({
    mutationFn: async () =>
      await createProductAttributeOption(definition.id, {
        key: optionKey.trim(),
        label: optionLabel.trim(),
      }),
    onError: (error) => toast.error(mutationError(error, t(ERROR_SAVE_FAILED))),
    onSuccess: async () => {
      await invalidateOptions()
      setOptionKey("")
      setOptionLabel("")
      toast.success(t("toasts.created"))
    },
  })
  const invalidateAfterOptionMutation = async () => {
    await Promise.all([
      invalidateOptions(),
      invalidateProductAttributeQueries(queryClient),
    ])
  }
  const deleteOptionMutation = useMutation({
    mutationFn: deleteProductAttributeOption,
    onError: (error) =>
      toast.error(mutationError(error, t(ERROR_DELETE_FAILED))),
    onSuccess: async () => {
      await invalidateAfterOptionMutation()
      toast.success(t(TOAST_DELETED))
    },
  })
  const permanentlyDeleteOptionMutation = useMutation({
    mutationFn: permanentlyDeleteProductAttributeOption,
    onError: (error) =>
      toast.error(mutationError(error, t(ERROR_DELETE_FAILED))),
    onSuccess: async () => {
      await Promise.all([
        invalidateAfterOptionMutation(),
        queryClient.invalidateQueries({
          queryKey: productAttributeQueryKeys.definitionLists(),
        }),
      ])
      toast.success(t(TOAST_DELETED))
    },
  })
  const restoreOptionMutation = useMutation({
    mutationFn: restoreProductAttributeOption,
    onError: (error) =>
      toast.error(mutationError(error, t("errors.restoreFailed"))),
    onSuccess: async () => {
      await invalidateAfterOptionMutation()
      toast.success(t("toasts.restored"))
    },
  })
  const confirmOptionMutation = async (
    option: ProductAttributeOption,
    permanent: boolean,
  ) => {
    const action = permanent ? ACTION_DELETE_PERMANENTLY : ACTION_DELETE
    const description = permanent
      ? "permanentDeletePrompt.option"
      : "deletePrompt.option"
    const confirmed = await prompt({
      cancelText: t(ACTION_CANCEL),
      confirmText: t(action),
      description: t(description, {
        count: option.usage_count,
        label: option.label,
      }),
      title: t(action),
    })
    if (confirmed) {
      if (permanent) {
        permanentlyDeleteOptionMutation.mutate(option.id)
      } else {
        deleteOptionMutation.mutate(option.id)
      }
    }
  }
  const options = optionsQuery.data?.options ?? []
  const optionCount = optionsQuery.data?.count ?? 0

  return (
    <>
      <div className="flex flex-col gap-3 border-t pt-4">
        <Text size="small" weight="plus">
          {t("options.title")}
        </Text>
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
          <Input
            aria-label={t(FIELD_LABEL)}
            onChange={(event) => {
              setOptionLabel(event.target.value)
            }}
            placeholder={t(FIELD_LABEL)}
            value={optionLabel}
          />
          <Input
            aria-label={t(FIELD_KEY)}
            onChange={(event) => {
              setOptionKey(event.target.value)
            }}
            placeholder={t(FIELD_KEY)}
            value={optionKey}
          />
          <Button
            disabled={!(optionKey.trim() && optionLabel.trim())}
            isLoading={createOptionMutation.isPending}
            onClick={() => {
              createOptionMutation.mutate()
            }}
            type="button"
            variant="secondary"
          >
            {t("actions.add")}
          </Button>
        </div>
        <div className="grid grid-cols-[1fr_160px] gap-2">
          <Input
            aria-label={t("placeholders.searchOptions")}
            onChange={(event) => {
              setOptionPage(0)
              setOptionQ(event.target.value)
            }}
            placeholder={t("placeholders.searchOptions")}
            value={optionQ}
          />
          <Select
            onValueChange={(value) => {
              if (isProductAttributeStatus(value)) {
                setOptionPage(0)
                setOptionStatus(value)
              }
            }}
            value={optionStatus}
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
        <DefinitionOptionsTable
          isLoading={optionsQuery.isLoading}
          onDelete={(option) => {
            void confirmOptionMutation(option, false)
          }}
          onEdit={setEditingOption}
          onPageChange={setOptionPage}
          onPermanentDelete={(option) => {
            void confirmOptionMutation(option, true)
          }}
          onRestore={(id) => {
            restoreOptionMutation.mutate(id)
          }}
          optionCount={optionCount}
          optionPage={optionPage}
          options={options}
          permanentlyDeleting={permanentlyDeleteOptionMutation.isPending}
          restoring={restoreOptionMutation.isPending}
        />
      </div>
      {editingOption ? (
        <OptionEditDrawer
          onOpenChange={(open) => {
            if (!open) {
              setEditingOption(undefined)
            }
          }}
          option={editingOption}
        />
      ) : null}
    </>
  )
}

const DefinitionEditDrawer = ({
  definition,
  onOpenChange,
}: {
  definition: ProductAttributeDefinition
  onOpenChange: (open: boolean) => void
}) => {
  const { t } = useTranslation("productAttributes")
  const queryClient = useQueryClient()
  const [label, setLabel] = useState(definition.label)
  const [isPublic, setIsPublic] = useState(definition.is_public)
  const saveMutation = useMutation({
    mutationFn: async () =>
      await updateProductAttributeDefinition(definition.id, {
        is_public: isPublic,
        label: label.trim(),
      }),
    onError: (error) => toast.error(mutationError(error, t(ERROR_SAVE_FAILED))),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: productAttributeQueryKeys.definitionLists(),
      })
      toast.success(t("toasts.saved"))
      onOpenChange(false)
    },
  })
  return (
    <Drawer onOpenChange={onOpenChange} open>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{definition.label}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-5 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <Label>{t(FIELD_KEY)}</Label>
            <Input disabled value={definition.key} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="product-attribute-definition-label">
              {t(FIELD_LABEL)}
            </Label>
            <Input
              id="product-attribute-definition-label"
              onChange={(event) => {
                setLabel(event.target.value)
              }}
              value={label}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="product-attribute-definition-public">
              {t("fields.isPublic")}
            </Label>
            <Switch
              checked={isPublic}
              id="product-attribute-definition-public"
              onCheckedChange={setIsPublic}
            />
          </div>
          {definition.input_type === "select" ? (
            <DefinitionOptions definition={definition} />
          ) : null}
        </Drawer.Body>
        <Drawer.Footer>
          <Button
            onClick={() => {
              onOpenChange(false)
            }}
            type="button"
            variant="secondary"
          >
            {t(ACTION_CANCEL)}
          </Button>
          <Button
            disabled={!label.trim()}
            isLoading={saveMutation.isPending}
            onClick={() => {
              saveMutation.mutate()
            }}
            type="button"
          >
            {t(ACTION_SAVE)}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const ProductAttributesSettingsPage = () => {
  const { t } = useTranslation("productAttributes")
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<ProductAttributeDefinition>()
  const [pageIndex, setPageIndex] = useState(0)
  const [q, setQ] = useState("")
  const [status, setStatus] = useState<ProductAttributeStatus>("active")
  const debouncedQ = useDebouncedValue(q)
  const params = {
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
    order: "label",
    q: debouncedQ,
    status,
  }
  const query = useQuery({
    queryFn: async () => await listProductAttributeDefinitions(params),
    queryKey: productAttributeQueryKeys.definitions(params),
  })
  const invalidateDefinitions = async () => {
    await queryClient.invalidateQueries({
      queryKey: productAttributeQueryKeys.definitionLists(),
    })
  }
  const deleteMutation = useMutation({
    mutationFn: deleteProductAttributeDefinition,
    onError: (error) =>
      toast.error(mutationError(error, t(ERROR_DELETE_FAILED))),
    onSuccess: async () => {
      await Promise.all([
        invalidateDefinitions(),
        invalidateProductAttributeQueries(queryClient),
      ])
      toast.success(t(TOAST_DELETED))
    },
  })
  const permanentlyDeleteMutation = useMutation({
    mutationFn: permanentlyDeleteProductAttributeDefinition,
    onError: (error) =>
      toast.error(mutationError(error, t(ERROR_DELETE_FAILED))),
    onSuccess: async () => {
      await Promise.all([
        invalidateDefinitions(),
        invalidateProductAttributeQueries(queryClient),
      ])
      toast.success(t(TOAST_DELETED))
    },
  })
  const restoreMutation = useMutation({
    mutationFn: restoreProductAttributeDefinition,
    onError: (error) =>
      toast.error(mutationError(error, t("errors.restoreFailed"))),
    onSuccess: async () => {
      await Promise.all([
        invalidateDefinitions(),
        invalidateProductAttributeQueries(queryClient),
      ])
      toast.success(t("toasts.restored"))
    },
  })
  const handleDelete = async (definition: ProductAttributeDefinition) => {
    const confirmed = await prompt({
      cancelText: t(ACTION_CANCEL),
      confirmText: t(ACTION_DELETE),
      description: t("deletePrompt.definition", {
        count: definition.usage_count,
        label: definition.label,
      }),
      title: t(ACTION_DELETE),
    })
    if (confirmed) {
      deleteMutation.mutate(definition.id)
    }
  }
  const handlePermanentDelete = async (
    definition: ProductAttributeDefinition,
  ) => {
    const confirmed = await prompt({
      cancelText: t(ACTION_CANCEL),
      confirmText: t(ACTION_DELETE_PERMANENTLY),
      description: t("permanentDeletePrompt.definition", {
        count: definition.usage_count,
        label: definition.label,
      }),
      title: t(ACTION_DELETE_PERMANENTLY),
    })
    if (confirmed) {
      permanentlyDeleteMutation.mutate(definition.id)
    }
  }
  const definitions = query.data?.definitions ?? []
  const count = query.data?.count ?? 0
  const pageCount = Math.max(Math.ceil(count / PAGE_SIZE), 1)

  return (
    <>
      <Container className="flex flex-col divide-y p-0">
        <div className="flex items-center justify-between gap-4 px-6 py-4">
          <div>
            <Heading>{t("title")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("description")}
            </Text>
          </div>
          <Button
            onClick={() => {
              setCreateOpen(true)
            }}
          >
            {t("actions.add")}
          </Button>
        </div>
        <div className="grid grid-cols-[1fr_180px] gap-3 px-6 py-4">
          <Input
            aria-label={t("placeholders.search")}
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
              if (isProductAttributeStatus(value)) {
                setStatus(value)
              }
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
              <Table.HeaderCell>{t("columns.label")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.key")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.type")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.public")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.usedBy")}</Table.HeaderCell>
              <Table.HeaderCell>{t("columns.status")}</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {definitions.map((definition) => (
              <Table.Row key={definition.id}>
                <Table.Cell>{definition.label}</Table.Cell>
                <Table.Cell className="text-ui-fg-subtle">
                  {definition.key}
                </Table.Cell>
                <Table.Cell>{t(`types.${definition.input_type}`)}</Table.Cell>
                <Table.Cell>
                  {definition.is_public ? t("status.yes") : t("status.no")}
                </Table.Cell>
                <Table.Cell>{definition.usage_count}</Table.Cell>
                <Table.Cell>
                  <StatusBadge
                    color={
                      definition.deleted_at !== null &&
                      definition.deleted_at !== undefined
                        ? "red"
                        : "green"
                    }
                  >
                    {definition.deleted_at !== null &&
                    definition.deleted_at !== undefined
                      ? t("status.deleted")
                      : t("status.active")}
                  </StatusBadge>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex justify-end gap-1">
                    {definition.deleted_at !== null &&
                    definition.deleted_at !== undefined ? (
                      <>
                        <Button
                          disabled={permanentlyDeleteMutation.isPending}
                          isLoading={restoreMutation.isPending}
                          onClick={() => {
                            restoreMutation.mutate(definition.id)
                          }}
                          size="small"
                          variant="secondary"
                        >
                          {t("actions.restore")}
                        </Button>
                        <IconButton
                          aria-label={t(ACTION_DELETE_PERMANENTLY)}
                          disabled={
                            restoreMutation.isPending ||
                            permanentlyDeleteMutation.isPending
                          }
                          onClick={() => {
                            void handlePermanentDelete(definition)
                          }}
                          size="small"
                          variant="transparent"
                        >
                          <Trash />
                        </IconButton>
                      </>
                    ) : (
                      <>
                        <IconButton
                          aria-label={t(ACTION_EDIT)}
                          onClick={() => {
                            setEditing(definition)
                          }}
                          size="small"
                          variant="transparent"
                        >
                          <PencilSquare />
                        </IconButton>
                        <IconButton
                          aria-label={t(ACTION_DELETE)}
                          onClick={() => {
                            void handleDelete(definition)
                          }}
                          size="small"
                          variant="transparent"
                        >
                          <Trash />
                        </IconButton>
                      </>
                    )}
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
            {definitions.length > 0 ? null : (
              <Table.Row>
                <Table.Cell>
                  {query.isLoading ? t(STATUS_LOADING) : t("widget.empty")}
                </Table.Cell>
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
                <Table.Cell />
              </Table.Row>
            )}
          </Table.Body>
        </Table>
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
      </Container>
      {createOpen ? (
        <DefinitionCreateModal onOpenChange={setCreateOpen} open={createOpen} />
      ) : null}
      {editing ? (
        <DefinitionEditDrawer
          definition={editing}
          onOpenChange={(open) => {
            if (!open) {
              setEditing(undefined)
            }
          }}
        />
      ) : null}
    </>
  )
}

export const config = defineRouteConfig({
  icon: Tag,
  label: "menuItem",
  translationNs: "productAttributes",
})

export default ProductAttributesSettingsPage
