import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText, PencilSquare } from "@medusajs/icons"
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
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"
import {
  STOREFRONT_TEXT_MARKETS,
  STOREFRONT_TEXT_NAMESPACES,
  STOREFRONT_TEXT_STATUSES,
  type StorefrontTextNamespace,
  type StorefrontTextStatus,
} from "../../../modules/storefront-text/registry"
import {
  listStorefrontTexts,
  type StorefrontText,
  storefrontTextQueryKeys,
  syncStorefrontTexts,
  updateStorefrontText,
} from "../../lib/storefront-texts"
import { useDebouncedValue } from "../../lib/use-debounced-value"

const PAGE_SIZE = 20
const ALL_VALUE = "all"

const STATUS_BADGE_COLOR: Record<StorefrontTextStatus, "green" | "orange"> = {
  active: "green",
  draft: "orange",
}

export const handle = {
  breadcrumb: () => "Jazyky",
}

const getMarketLabel = (market: string) =>
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
  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>Načítám...</Table.Cell>
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
        <Table.Cell>Žádné texty nenalezeny.</Table.Cell>
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
          <Text size="small">{getMarketLabel(storefrontText.market)}</Text>
          <Text className="text-ui-fg-subtle" size="small">
            {storefrontText.domain}
          </Text>
        </div>
      </Table.Cell>
      <Table.Cell>{storefrontText.locale}</Table.Cell>
      <Table.Cell>
        <StatusBadge color={STATUS_BADGE_COLOR[storefrontText.status]}>
          {storefrontText.status}
        </StatusBadge>
      </Table.Cell>
      <Table.Cell>
        <div className="flex items-center justify-between gap-2">
          <Text className="line-clamp-2" size="small">
            {getValuePreview(storefrontText.value)}
          </Text>
          <IconButton
            aria-label="Upravit text"
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
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<StorefrontTextStatus>("active")
  const [value, setValue] = useState("")

  useEffect(() => {
    if (open && storefrontText) {
      setStatus(storefrontText.status)
      setValue(storefrontText.value)
    }
  }, [open, storefrontText])

  const mutation = useMutation({
    mutationFn: () => {
      if (!storefrontText) {
        throw new Error("Storefront text is required")
      }

      return updateStorefrontText(storefrontText.id, {
        status,
        value,
      })
    },
    onError: () => {
      toast.error("Text se nepodařilo uložit.")
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: storefrontTextQueryKeys.lists(),
      })
      toast.success("Text uložen.")
      onOpenChange(false)
    },
  })

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Upravit text</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto p-4">
          {storefrontText ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Text className="text-ui-fg-subtle" size="small">
                    Klíč
                  </Text>
                  <Text size="small" weight="plus">
                    {storefrontText.key}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <Text className="text-ui-fg-subtle" size="small">
                    Namespace
                  </Text>
                  <Text size="small" weight="plus">
                    {storefrontText.namespace}
                  </Text>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <Text className="text-ui-fg-subtle" size="small">
                    Market
                  </Text>
                  <Text size="small" weight="plus">
                    {getMarketLabel(storefrontText.market)}
                  </Text>
                </div>
                <div className="flex flex-col gap-1">
                  <Text className="text-ui-fg-subtle" size="small">
                    Locale
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
            <Label>Hodnota</Label>
            <Textarea
              onChange={(event) => setValue(event.target.value)}
              rows={5}
              value={value}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Status</Label>
            <Select
              onValueChange={(nextStatus) =>
                setStatus(nextStatus as StorefrontTextStatus)
              }
              value={status}
            >
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {STOREFRONT_TEXT_STATUSES.map((item) => (
                  <Select.Item key={item} value={item}>
                    {item}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-2">
            <Drawer.Close asChild>
              <Button size="small" type="button" variant="secondary">
                Zrušit
              </Button>
            </Drawer.Close>
            <Button
              disabled={!value.trim()}
              isLoading={mutation.isPending}
              onClick={() => mutation.mutate()}
              size="small"
              type="button"
            >
              Uložit
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

const StorefrontTextsPage = () => {
  const queryClient = useQueryClient()
  const [pageIndex, setPageIndex] = useState(0)
  const [query, setQuery] = useState("")
  const [market, setMarket] = useState<string | undefined>()
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
    status,
  }
  const { data, isLoading } = useQuery({
    queryFn: () => listStorefrontTexts(params),
    queryKey: storefrontTextQueryKeys.list(params),
  })
  const syncMutation = useMutation({
    mutationFn: syncStorefrontTexts,
    onError: () => {
      toast.error("Synchronizace se nepodařila.")
    },
    onSuccess: async (response) => {
      await queryClient.invalidateQueries({
        queryKey: storefrontTextQueryKeys.lists(),
      })
      toast.success(
        `Synchronizováno: ${response.result.created_count} nových, ${response.result.updated_count} upravených.`
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
            <Heading level="h1">Jazyky</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Editace storefront UI textů řízených backendem.
            </Text>
          </div>
          <Button
            isLoading={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
            size="small"
            type="button"
            variant="secondary"
          >
            Synchronizovat klíče
          </Button>
        </div>
        <div className="grid gap-2 md:grid-cols-[minmax(180px,320px)_repeat(3,minmax(140px,180px))]">
          <Input
            onChange={(event) => {
              resetPage()
              setQuery(event.target.value)
            }}
            placeholder="Hledat text"
            value={query}
          />
          <Select
            onValueChange={(value) => {
              resetPage()
              setMarket(value === ALL_VALUE ? undefined : value)
            }}
            value={market ?? ALL_VALUE}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL_VALUE}>Všechny markety</Select.Item>
              {STOREFRONT_TEXT_MARKETS.map((item) => (
                <Select.Item key={item.market} value={item.market}>
                  {item.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Select
            onValueChange={(value) => {
              resetPage()
              setNamespace(
                value === ALL_VALUE
                  ? undefined
                  : (value as StorefrontTextNamespace)
              )
            }}
            value={namespace ?? ALL_VALUE}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL_VALUE}>Všechny namespace</Select.Item>
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
                value === ALL_VALUE
                  ? undefined
                  : (value as StorefrontTextStatus)
              )
            }}
            value={status ?? ALL_VALUE}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value={ALL_VALUE}>Všechny statusy</Select.Item>
              {STOREFRONT_TEXT_STATUSES.map((item) => (
                <Select.Item key={item} value={item}>
                  {item}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
      </div>
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Interní jméno</Table.HeaderCell>
            <Table.HeaderCell>Namespace</Table.HeaderCell>
            <Table.HeaderCell>Market</Table.HeaderCell>
            <Table.HeaderCell>Locale</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Hodnota</Table.HeaderCell>
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
          next: "Další",
          of: "z",
          pages: "stran",
          prev: "Předchozí",
          results: "výsledků",
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
  label: "Jazyky",
})

export default StorefrontTextsPage
