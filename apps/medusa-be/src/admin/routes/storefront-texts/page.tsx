import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText, PencilSquare } from "@medusajs/icons"
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
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  isStorefrontTextMarket,
  isStorefrontTextNamespace,
  isStorefrontTextStatus,
  STOREFRONT_TEXT_MARKETS,
  STOREFRONT_TEXT_NAMESPACES,
  STOREFRONT_TEXT_STATUSES,
  type StorefrontTextMarket,
  type StorefrontTextNamespace,
  type StorefrontTextStatus,
} from "../../../modules/storefront-text/configuration"
import {
  listStorefrontTexts,
  type StorefrontText,
  type StorefrontTextInput,
  type StorefrontTextSearchScope,
  storefrontTextQueryKeys,
  syncStorefrontTexts,
  updateStorefrontText,
} from "../../lib/storefront-texts"
import { translateBreadcrumb } from "../../lib/breadcrumb"
import { useDebouncedValue } from "../../lib/use-debounced-value"
import { StorefrontTextCatalogActions } from "./components/catalog-actions"

const PAGE_SIZE = 20
const ALL_VALUE = "all"

const STATUS_BADGE_COLOR: Record<StorefrontTextStatus, "green" | "orange"> = {
  active: "green",
  draft: "orange",
}

export const handle = {
  breadcrumb: () =>
    translateBreadcrumb("storefrontTexts:menuItem", "Languages"),
}

const getMarketFallbackLabel = (market: string) =>
  STOREFRONT_TEXT_MARKETS.find((item) => item.market === market)?.label ??
  market

const getValuePreview = (value: string) =>
  value.length > 72 ? `${value.slice(0, 72)}...` : value

const StorefrontTextRows = ({
  isLoading,
  onEdit,
  storefrontTexts,
}: {
  isLoading: boolean
  onEdit: (storefrontText: StorefrontText) => void
  storefrontTexts: StorefrontText[]
}) => {
  const { t } = useTranslation("storefrontTexts")

  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>{t("table.loading")}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  if (!storefrontTexts.length) {
    return (
      <Table.Row>
        <Table.Cell>{t("table.empty")}</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return storefrontTexts.map((storefrontText) => (
    <Table.Row
      className="cursor-pointer"
      key={storefrontText.id}
      onClick={() => onEdit(storefrontText)}
    >
      <Table.Cell>
        <div className="flex max-w-[360px] flex-col gap-1">
          <Text size="small" weight="plus">
            {storefrontText.key}
          </Text>
          {storefrontText.description ? (
            <Text className="text-ui-fg-subtle" size="small">
              {storefrontText.description}
            </Text>
          ) : null}
        </div>
      </Table.Cell>
      <Table.Cell>{storefrontText.namespace}</Table.Cell>
      <Table.Cell>
        <div className="flex flex-col">
          <Text size="small">
            {t(`markets.${storefrontText.market}`, {
              defaultValue: getMarketFallbackLabel(storefrontText.market),
            })}
          </Text>
          <Text className="text-ui-fg-subtle" size="small">
            {storefrontText.domain}
          </Text>
        </div>
      </Table.Cell>
      <Table.Cell>{storefrontText.locale}</Table.Cell>
      <Table.Cell>
        <StatusBadge color={STATUS_BADGE_COLOR[storefrontText.status]}>
          {t(`statuses.${storefrontText.status}`)}
        </StatusBadge>
      </Table.Cell>
      <Table.Cell>
        <div className="flex items-center justify-between gap-2">
          <Text className="line-clamp-2" size="small">
            {getValuePreview(storefrontText.effective_value)}
          </Text>
          <IconButton
            aria-label={t("actions.edit")}
            onClick={(event) => {
              event.stopPropagation()
              onEdit(storefrontText)
            }}
            size="small"
            type="button"
            variant="transparent"
          >
            <PencilSquare />
          </IconButton>
        </div>
      </Table.Cell>
    </Table.Row>
  ))
}

const StorefrontTextEditDrawer = ({
  onOpenChange,
  open,
  storefrontText,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  storefrontText: StorefrontText | null
}) => {
  const { t } = useTranslation("storefrontTexts")
  const queryClient = useQueryClient()
  const [overrideValue, setOverrideValue] = useState("")
  const [status, setStatus] = useState<StorefrontTextStatus>("active")

  useEffect(() => {
    if (open && storefrontText) {
      setOverrideValue(
        storefrontText.override_value ?? storefrontText.default_value
      )
      setStatus(storefrontText.status)
    }
  }, [open, storefrontText])

  const mutation = useMutation({
    mutationFn: (input: StorefrontTextInput) => {
      if (!storefrontText) {
        throw new Error(t("errors.missingText"))
      }

      return updateStorefrontText(storefrontText.id, input)
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.saveFailed")
      )
    },
    onSuccess: async (_, input) => {
      await queryClient.invalidateQueries({
        queryKey: storefrontTextQueryKeys.lists(),
      })
      toast.success(
        input.override_value === null
          ? t("toasts.reset")
          : t("toasts.saved")
      )
      onOpenChange(false)
    },
  })

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{t("drawer.title")}</Drawer.Title>
          <Drawer.Description className="sr-only">
            {t("drawer.description")}
          </Drawer.Description>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto p-4">
          {storefrontText ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.key")}
                  </Text>
                  <Text size="small" weight="plus">
                    {storefrontText.key}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.namespace")}
                  </Text>
                  <Text size="small" weight="plus">
                    {storefrontText.namespace}
                  </Text>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.market")}
                  </Text>
                  <Text size="small" weight="plus">
                    {t(`markets.${storefrontText.market}`, {
                      defaultValue: getMarketFallbackLabel(storefrontText.market),
                    })}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <Text className="text-ui-fg-subtle" size="small">
                    {t("fields.locale")}
                  </Text>
                  <Text size="small" weight="plus">
                    {storefrontText.locale}
                  </Text>
                </div>
              </div>
              {storefrontText.description ? (
                <Text className="text-ui-fg-subtle" size="small">
                  {storefrontText.description}
                </Text>
              ) : null}
            </>
          ) : null}
          <div className="flex flex-col gap-2">
            <Label>{t("fields.defaultValue")}</Label>
            <Textarea
              readOnly
              rows={5}
              value={storefrontText?.default_value ?? ""}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("fields.overrideValue")}</Label>
            <Textarea
              onChange={(event) => setOverrideValue(event.target.value)}
              rows={5}
              value={overrideValue}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t("fields.status")}</Label>
            <Select
              onValueChange={(nextStatus) => {
                if (isStorefrontTextStatus(nextStatus)) {
                  setStatus(nextStatus)
                }
              }}
              value={status}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {STOREFRONT_TEXT_STATUSES.map((item) => (
                  <Select.Item key={item} value={item}>
                    {t(`statuses.${item}`)}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex w-full items-center justify-between gap-2">
            <Button
              disabled={mutation.isPending || !storefrontText?.has_override}
              isLoading={
                mutation.isPending && mutation.variables?.override_value === null
              }
              onClick={() => mutation.mutate({ override_value: null })}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.resetDefault")}
            </Button>
            <div className="flex items-center justify-end gap-2">
              <Drawer.Close asChild>
                <Button size="small" type="button" variant="secondary">
                  {t("actions.cancel")}
                </Button>
              </Drawer.Close>
              <Button
                disabled={mutation.isPending || !overrideValue.trim()}
                isLoading={
                  mutation.isPending && mutation.variables?.override_value !== null
                }
                onClick={() =>
                  mutation.mutate({
                    override_value: overrideValue,
                    status,
                  })
                }
                size="small"
                type="button"
              >
                {t("actions.save")}
              </Button>
            </div>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const StorefrontTextsPage = () => {
  const { t } = useTranslation("storefrontTexts")
  const queryClient = useQueryClient()
  const [pageIndex, setPageIndex] = useState(0)
  const [query, setQuery] = useState("")
  const [searchScope, setSearchScope] =
    useState<StorefrontTextSearchScope>("value")
  const [market, setMarket] = useState<StorefrontTextMarket | undefined>()
  const [namespace, setNamespace] = useState<
    StorefrontTextNamespace | undefined
  >()
  const [status, setStatus] = useState<StorefrontTextStatus | undefined>()
  const [editedText, setEditedText] = useState<StorefrontText | null>(null)
  const debouncedQuery = useDebouncedValue(query, 250)
  const params = {
    limit: PAGE_SIZE,
    market,
    namespace,
    offset: pageIndex * PAGE_SIZE,
    q: debouncedQuery || undefined,
    search_scope: searchScope,
    status,
  }
  const { data, isLoading } = useQuery({
    queryFn: () => listStorefrontTexts(params),
    queryKey: storefrontTextQueryKeys.list(params),
  })
  const syncMutation = useMutation({
    mutationFn: syncStorefrontTexts,
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.syncFailed")
      )
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: storefrontTextQueryKeys.lists(),
      })
      toast.success(
        t("toasts.synchronized", {
          created: response.result.created_count,
          updated: response.result.updated_count,
        })
      )
    },
  })
  const storefrontTexts = data?.storefront_texts ?? []
  const count = data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE))

  const resetPage = () => setPageIndex(0)

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-4 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Heading level="h1">{t("menuItem")}</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              {t("description")}
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StorefrontTextCatalogActions market={market} />
            <Button
              isLoading={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.sync")}
            </Button>
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(180px,320px)_max-content_repeat(3,minmax(140px,180px))]">
          <Input
            onChange={(event) => {
              resetPage()
              setQuery(event.target.value)
            }}
            placeholder={
              searchScope === "value"
                ? t("filters.searchValues")
                : t("filters.searchAll")
            }
            value={query}
          />
          <div className="flex min-h-8 items-center gap-2 px-1">
            <Checkbox
              checked={searchScope === "value"}
              id="storefront-text-value-search"
              onCheckedChange={(checked) => {
                resetPage()
                setSearchScope(checked === true ? "value" : "all")
              }}
            />
            <Label htmlFor="storefront-text-value-search" size="small">
              {t("filters.onlyValues")}
            </Label>
          </div>
          <Select
            onValueChange={(value) => {
              resetPage()
              setMarket(
                value !== ALL_VALUE && isStorefrontTextMarket(value)
                  ? value
                  : undefined
              )
            }}
            value={market ?? ALL_VALUE}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL_VALUE}>
                {t("filters.allMarkets")}
              </Select.Item>
              {STOREFRONT_TEXT_MARKETS.map((item) => (
                <Select.Item key={item.market} value={item.market}>
                  {t(`markets.${item.market}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Select
            onValueChange={(value) => {
              resetPage()
              setNamespace(
                value !== ALL_VALUE && isStorefrontTextNamespace(value)
                  ? value
                  : undefined
              )
            }}
            value={namespace ?? ALL_VALUE}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL_VALUE}>
                {t("filters.allNamespaces")}
              </Select.Item>
              {STOREFRONT_TEXT_NAMESPACES.map((item) => (
                <Select.Item key={item} value={item}>
                  {item}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Select
            onValueChange={(value) => {
              resetPage()
              setStatus(
                value !== ALL_VALUE && isStorefrontTextStatus(value)
                  ? value
                  : undefined
              )
            }}
            value={status ?? ALL_VALUE}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL_VALUE}>
                {t("filters.allStatuses")}
              </Select.Item>
              {STOREFRONT_TEXT_STATUSES.map((item) => (
                <Select.Item key={item} value={item}>
                  {t(`statuses.${item}`)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>{t("table.internalName")}</Table.HeaderCell>
            <Table.HeaderCell>{t("table.namespace")}</Table.HeaderCell>
            <Table.HeaderCell>{t("table.market")}</Table.HeaderCell>
            <Table.HeaderCell>{t("table.locale")}</Table.HeaderCell>
            <Table.HeaderCell>{t("table.status")}</Table.HeaderCell>
            <Table.HeaderCell>{t("table.value")}</Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <StorefrontTextRows
            isLoading={isLoading}
            onEdit={setEditedText}
            storefrontTexts={storefrontTexts}
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
        previousPage={() => setPageIndex((current) => Math.max(current - 1, 0))}
        translations={{
          next: t("pagination.next"),
          of: t("pagination.of"),
          pages: t("pagination.pages"),
          prev: t("pagination.previous"),
          results: t("pagination.results"),
        }}
      />
      <StorefrontTextEditDrawer
        onOpenChange={(open) => {
          if (!open) {
            setEditedText(null)
          }
        }}
        open={Boolean(editedText)}
        storefrontText={editedText}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  icon: DocumentText,
  label: "menuItem",
  translationNs: "storefrontTexts",
})

export default StorefrontTextsPage
