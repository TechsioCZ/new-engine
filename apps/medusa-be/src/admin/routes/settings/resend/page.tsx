import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Select,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import { sdk } from "../../../lib/sdk"

export const handle = {
  breadcrumb: () => "Resend",
}

type ApiStoreConfig = {
  id: string
  name: string
  enabled: boolean
  has_api_key: boolean
}

type ApiStoreListResponse = {
  api_stores: ApiStoreConfig[]
}

type ResendMarketConfig = {
  from_email: string
  reply_to: string
  template_mappings: Record<string, string>
}

type ResendConfig = {
  api_store_id: string | null
  from_email: string | null
  has_webhook_secret: boolean
  is_enabled: boolean
  request_timeout_ms: number
  market_configurations: Partial<Record<ResendMarket, ResendMarketConfig>>
  template_mappings: Record<string, string>
  product_review_request_delay_minutes: number
}

type ResendTemplateContract = {
  key: string
  label: string
}

type ResendConfigResponse = {
  config: ResendConfig
  template_contracts: ResendTemplateContract[]
}

const NO_API_STORE_SELECTION = "none"
const MAXIMUM_PRODUCT_REVIEW_DELAY_MINUTES = 525_600

const RESEND_MARKETS = ["sk", "cz", "hu", "ro"] as const
type ResendMarket = (typeof RESEND_MARKETS)[number]

const RESEND_MARKET_LABELS: Record<ResendMarket, string> = {
  cz: "Czech Republic (CZ)",
  hu: "Hungary (HU)",
  ro: "Romania (RO)",
  sk: "Slovakia (SK)",
}

type MarketConfigState = Record<ResendMarket, ResendMarketConfig>

export const buildMarketConfigState = (
  marketConfigurations: Partial<Record<ResendMarket, ResendMarketConfig>>
): MarketConfigState =>
  RESEND_MARKETS.reduce((state, market) => {
    const marketConfig = marketConfigurations[market]
    state[market] = {
      from_email: marketConfig?.from_email ?? "",
      reply_to: marketConfig?.reply_to ?? "",
      template_mappings: { ...(marketConfig?.template_mappings ?? {}) },
    }
    return state
  }, {} as MarketConfigState)

type ResendConfigFormState = {
  apiStoreId: string
  fromEmail: string
  isEnabled: boolean
  requestTimeoutMs: string
  productReviewDelayMinutes: string
  templateMappings: Record<string, string>
  marketConfigurations: MarketConfigState
  webhookSecret: string
  clearWebhookSecret: boolean
}

export type ResendConfigSubmitResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; error: string }

export const buildResendConfigSubmitResult = (
  form: ResendConfigFormState
): ResendConfigSubmitResult => {
  const timeout = Number(form.requestTimeoutMs)
  const reviewDelay = Number(form.productReviewDelayMinutes)

  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 120_000) {
    return {
      error: "Request Timeout must be between 1000 and 120000 ms",
      ok: false,
    }
  }

  if (
    !Number.isInteger(reviewDelay) ||
    reviewDelay < 0 ||
    reviewDelay > MAXIMUM_PRODUCT_REVIEW_DELAY_MINUTES
  ) {
    return {
      error: "Review Request Delay must be between 0 and 525600 minutes",
      ok: false,
    }
  }

  const body: Record<string, unknown> = {
    api_store_id: form.apiStoreId || null,
    from_email: form.fromEmail.trim() || null,
    is_enabled: form.isEnabled,
    request_timeout_ms: timeout,
    product_review_request_delay_minutes: reviewDelay,
    template_mappings: form.templateMappings,
    market_configurations: form.marketConfigurations,
  }

  if (form.clearWebhookSecret) {
    body.webhook_secret = null
  } else if (form.webhookSecret.trim()) {
    body.webhook_secret = form.webhookSecret.trim()
  }

  return { body, ok: true }
}

const ResendSettingsPage = () => {
  const queryClient = useQueryClient()
  const [apiStoreId, setApiStoreId] = useState("")
  const [fromEmail, setFromEmail] = useState("")
  const [isEnabled, setIsEnabled] = useState(false)
  const [requestTimeoutMs, setRequestTimeoutMs] = useState("10000")
  const [productReviewDelayMinutes, setProductReviewDelayMinutes] =
    useState("10080")
  const [templateMappings, setTemplateMappings] = useState<
    Record<string, string>
  >({})
  const [marketConfigurations, setMarketConfigurations] =
    useState<MarketConfigState>(buildMarketConfigState({}))
  const [webhookSecret, setWebhookSecret] = useState("")
  const [clearWebhookSecret, setClearWebhookSecret] = useState(false)

  const configQuery = useQuery({
    queryFn: () =>
      sdk.client.fetch<ResendConfigResponse>("/admin/resend-config"),
    queryKey: ["resend-config"],
  })
  const apiStoresQuery = useQuery({
    queryFn: () =>
      sdk.client.fetch<ApiStoreListResponse>(
        "/admin/api-store?limit=100&offset=0"
      ),
    queryKey: ["api-store", "resend-options"],
  })

  useEffect(() => {
    const config = configQuery.data?.config
    if (!config) {
      return
    }

    setApiStoreId(config.api_store_id ?? "")
    setFromEmail(config.from_email ?? "")
    setIsEnabled(config.is_enabled)
    setRequestTimeoutMs(String(config.request_timeout_ms))
    setProductReviewDelayMinutes(
      String(config.product_review_request_delay_minutes)
    )
    setTemplateMappings(config.template_mappings)
    setMarketConfigurations(
      buildMarketConfigState(config.market_configurations ?? {})
    )
    setWebhookSecret("")
    setClearWebhookSecret(false)
  }, [configQuery.data])

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      sdk.client.fetch<ResendConfigResponse>("/admin/resend-config", {
        body,
        method: "POST",
      }),
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to save Resend configuration"
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["resend-config"] })
      toast.success("Resend configuration saved")
    },
  })

  const updateMarketField = (
    market: ResendMarket,
    field: "from_email" | "reply_to",
    value: string
  ) => {
    setMarketConfigurations((current) => ({
      ...current,
      [market]: { ...current[market], [field]: value },
    }))
  }

  const updateMarketTemplateMapping = (
    market: ResendMarket,
    templateKey: string,
    value: string
  ) => {
    setMarketConfigurations((current) => ({
      ...current,
      [market]: {
        ...current[market],
        template_mappings: {
          ...current[market].template_mappings,
          [templateKey]: value,
        },
      },
    }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const result = buildResendConfigSubmitResult({
      apiStoreId,
      clearWebhookSecret,
      fromEmail,
      isEnabled,
      marketConfigurations,
      productReviewDelayMinutes,
      requestTimeoutMs,
      templateMappings,
      webhookSecret,
    })

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    updateMutation.mutate(result.body)
  }

  if (configQuery.isLoading || apiStoresQuery.isLoading) {
    return <Container>Loading Resend configuration...</Container>
  }

  if (configQuery.error || apiStoresQuery.error) {
    return (
      <Container>
        <Text className="text-ui-fg-error">
          Failed to load Resend configuration.
        </Text>
      </Container>
    )
  }

  const apiStores = [...(apiStoresQuery.data?.api_stores ?? [])].sort(
    (left, right) => left.name.localeCompare(right.name)
  )
  const hasWebhookSecret = configQuery.data?.config.has_webhook_secret ?? false

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-1 px-6 py-4">
        <Heading>Resend Configuration</Heading>
        <Text className="text-ui-fg-subtle" size="small">
          Link a key from API Store and configure Resend email delivery.
        </Text>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-4">
          <Heading className="mb-4" level="h2">
            General
          </Heading>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="resend-enabled" id="resend-enabled-label">
                Enable Resend
              </Label>
              <Text
                className="text-sm text-ui-fg-subtle"
                id="resend-enabled-desc"
              >
                Enable or disable Resend email delivery
              </Text>
            </div>
            <Switch
              aria-describedby="resend-enabled-desc"
              aria-labelledby="resend-enabled-label"
              checked={isEnabled}
              id="resend-enabled"
              onCheckedChange={setIsEnabled}
            />
          </div>
        </div>

        <div className="flex flex-col gap-6 border-t px-6 py-6">
          <div className="flex flex-col gap-2">
            <Label htmlFor="resend-api-store">API Store Configuration</Label>
            <Select
              onValueChange={(value) =>
                setApiStoreId(value === NO_API_STORE_SELECTION ? "" : value)
              }
              value={apiStoreId || NO_API_STORE_SELECTION}
            >
              <Select.Trigger id="resend-api-store">
                <Select.Value placeholder="Select an API Store record" />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value={NO_API_STORE_SELECTION}>
                  No API Store record
                </Select.Item>
                {apiStores.map((apiStore) => (
                  <Select.Item key={apiStore.id} value={apiStore.id}>
                    {apiStore.name}
                    {apiStore.enabled && apiStore.has_api_key
                      ? ""
                      : " (disabled or missing key)"}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
            <Text className="text-ui-fg-subtle" size="small">
              Create and manage the Resend API key under Settings → API Store.
            </Text>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="resend-review-delay">
              Review Request Delay (minutes)
            </Label>
            <Input
              id="resend-review-delay"
              max={MAXIMUM_PRODUCT_REVIEW_DELAY_MINUTES}
              min={0}
              onChange={(event) =>
                setProductReviewDelayMinutes(event.target.value)
              }
              type="number"
              value={productReviewDelayMinutes}
            />
            <Text className="text-ui-fg-subtle" size="small">
              Wait this long after payment before requesting product reviews.
            </Text>
          </div>

          <div className="flex flex-col gap-4 border-t pt-6">
            <div>
              <Heading level="h2">Email Templates</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                Map each notification to its Resend template ID.
              </Text>
            </div>
            {(configQuery.data?.template_contracts ?? []).map((template) => (
              <div className="flex flex-col gap-2" key={template.key}>
                <Label htmlFor={`resend-template-${template.key}`}>
                  {template.label}
                </Label>
                <Input
                  id={`resend-template-${template.key}`}
                  onChange={(event) =>
                    setTemplateMappings((current) => ({
                      ...current,
                      [template.key]: event.target.value,
                    }))
                  }
                  placeholder={template.key}
                  value={templateMappings[template.key] ?? ""}
                />
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-6 border-t pt-6">
            <div>
              <Heading level="h2">Market Configurations</Heading>
              <Text className="text-ui-fg-subtle" size="small">
                Configure sender details and template overrides for each of the
                four markets.
              </Text>
            </div>
            {RESEND_MARKETS.map((market) => {
              const marketConfig = marketConfigurations[market]
              return (
                <div
                  className="flex flex-col gap-4 rounded-lg border p-4"
                  key={market}
                >
                  <Heading level="h3">{RESEND_MARKET_LABELS[market]}</Heading>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`resend-market-${market}-from-email`}>
                        From Email
                      </Label>
                      <Input
                        id={`resend-market-${market}-from-email`}
                        onChange={(event) =>
                          updateMarketField(
                            market,
                            "from_email",
                            event.target.value
                          )
                        }
                        placeholder={`Store <orders@${market}.example.com>`}
                        value={marketConfig.from_email}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label htmlFor={`resend-market-${market}-reply-to`}>
                        Reply To
                      </Label>
                      <Input
                        id={`resend-market-${market}-reply-to`}
                        onChange={(event) =>
                          updateMarketField(
                            market,
                            "reply_to",
                            event.target.value
                          )
                        }
                        placeholder={`support@${market}.example.com`}
                        value={marketConfig.reply_to}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-4">
                    {(configQuery.data?.template_contracts ?? []).map(
                      (template) => (
                        <div
                          className="flex flex-col gap-2"
                          key={`${market}-${template.key}`}
                        >
                          <Label
                            htmlFor={`resend-market-${market}-template-${template.key}`}
                          >
                            {template.label}
                          </Label>
                          <Input
                            id={`resend-market-${market}-template-${template.key}`}
                            onChange={(event) =>
                              updateMarketTemplateMapping(
                                market,
                                template.key,
                                event.target.value
                              )
                            }
                            placeholder={template.key}
                            value={
                              marketConfig.template_mappings[template.key] ?? ""
                            }
                          />
                        </div>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="resend-from-email">From Email</Label>
            <Input
              id="resend-from-email"
              onChange={(event) => setFromEmail(event.target.value)}
              placeholder="Store <orders@example.com>"
              value={fromEmail}
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="resend-webhook-secret">
                Webhook Secret{" "}
                {hasWebhookSecret && !clearWebhookSecret && (
                  <span className="text-ui-fg-subtle">(set)</span>
                )}
                {clearWebhookSecret && (
                  <span className="text-ui-fg-error">(will be cleared)</span>
                )}
              </Label>
              {hasWebhookSecret && !clearWebhookSecret && (
                <button
                  className="text-sm text-ui-fg-subtle hover:text-ui-fg-error"
                  onClick={() => {
                    setClearWebhookSecret(true)
                    setWebhookSecret("")
                  }}
                  type="button"
                >
                  Clear
                </button>
              )}
            </div>
            <Input
              disabled={clearWebhookSecret}
              id="resend-webhook-secret"
              onChange={(event) => setWebhookSecret(event.target.value)}
              placeholder={
                hasWebhookSecret ? "Leave empty to keep" : "whsec_..."
              }
              type="password"
              value={clearWebhookSecret ? "" : webhookSecret}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="resend-request-timeout">Request Timeout (ms)</Label>
            <Input
              id="resend-request-timeout"
              max={120_000}
              min={1000}
              onChange={(event) => setRequestTimeoutMs(event.target.value)}
              type="number"
              value={requestTimeoutMs}
            />
          </div>

          <div className="flex justify-end">
            <Button isLoading={updateMutation.isPending} type="submit">
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Resend",
})

export default ResendSettingsPage
