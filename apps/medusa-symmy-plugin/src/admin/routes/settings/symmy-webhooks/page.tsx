import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Plus, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  IconButton,
  Input,
  Label,
  Switch,
  Text,
  Tooltip,
  toast,
} from "@medusajs/ui"
import { useState, useSyncExternalStore } from "react"
import type { ChangeEvent } from "react"

interface SymmyWebhookEndpoint {
  url: string
  enabled: boolean
}

interface SymmyWebhookFormEndpoint extends SymmyWebhookEndpoint {
  key: string
}

interface SymmyWebhookConfigResponse {
  id: string
  is_enabled: boolean
  endpoints: SymmyWebhookEndpoint[]
}

interface SymmyWebhookConfigInput {
  is_enabled: boolean
  endpoints: SymmyWebhookFormEndpoint[]
}

const fetchJson = async (
  path: string,
  options?: RequestInit,
): Promise<unknown> => {
  const response = await fetch(path, {
    ...options,
    credentials: "include",
    headers: new Headers({
      "content-type": "application/json",
      ...Object.fromEntries(new Headers(options?.headers).entries()),
    }),
  })

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }

  return await response.json()
}

const parseConfigResponse = (value: unknown): SymmyWebhookConfigResponse => {
  if (typeof value !== "object" || value === null || !("config" in value)) {
    throw new Error("Webhook configuration response is invalid")
  }
  const { config } = value
  if (typeof config !== "object" || config === null) {
    throw new Error("Webhook configuration is invalid")
  }
  if (!("id" in config) || typeof config.id !== "string") {
    throw new Error("Webhook configuration ID is invalid")
  }
  if (!("is_enabled" in config) || typeof config.is_enabled !== "boolean") {
    throw new Error("Webhook enabled state is invalid")
  }
  if (!("endpoints" in config) || !Array.isArray(config.endpoints)) {
    throw new Error("Webhook endpoints are invalid")
  }
  const candidates: unknown[] = config.endpoints
  const endpoints: SymmyWebhookEndpoint[] = []
  for (const endpoint of candidates) {
    if (typeof endpoint !== "object" || endpoint === null) {
      throw new Error("Webhook endpoint is invalid")
    }
    if (!("url" in endpoint) || typeof endpoint.url !== "string") {
      throw new Error("Webhook endpoint URL is invalid")
    }
    if (!("enabled" in endpoint) || typeof endpoint.enabled !== "boolean") {
      throw new Error("Webhook endpoint state is invalid")
    }
    endpoints.push({ enabled: endpoint.enabled, url: endpoint.url })
  }
  return { endpoints, id: config.id, is_enabled: config.is_enabled }
}

const createEndpointKey = () => crypto.randomUUID()

const createEmptyEndpoint = (): SymmyWebhookFormEndpoint => ({
  enabled: true,
  key: createEndpointKey(),
  url: "",
})

const toFormEndpoints = (
  endpoints: SymmyWebhookEndpoint[],
): SymmyWebhookFormEndpoint[] =>
  endpoints.length === 0
    ? [createEmptyEndpoint()]
    : endpoints.map((endpoint) => ({
        ...endpoint,
        key: createEndpointKey(),
      }))

type WebhookConfigState =
  | { status: "loading" }
  | { error: string; status: "error" }
  | { config: SymmyWebhookConfigResponse; status: "ready" }

let webhookConfigState: WebhookConfigState = { status: "loading" }
let webhookConfigRequestStarted = false
const webhookConfigListeners = new Set<() => void>()

const notifyWebhookConfigListeners = () => {
  for (const listener of webhookConfigListeners) {
    listener()
  }
}

const loadWebhookConfig = async () => {
  try {
    const response = await fetchJson("/admin/symmy-webhooks")
    webhookConfigState = {
      config: parseConfigResponse(response),
      status: "ready",
    }
  } catch (error) {
    webhookConfigState = {
      error: error instanceof Error ? error.message : "Unknown request error",
      status: "error",
    }
  }
  notifyWebhookConfigListeners()
}

const subscribeToWebhookConfig = (listener: () => void) => {
  webhookConfigListeners.add(listener)
  if (!webhookConfigRequestStarted) {
    webhookConfigRequestStarted = true
    void loadWebhookConfig()
  }
  return () => {
    webhookConfigListeners.delete(listener)
  }
}

const getWebhookConfigSnapshot = () => webhookConfigState

const SymmyWebhooksForm = ({
  config,
}: {
  config: SymmyWebhookConfigResponse
}) => {
  const [formData, setFormData] = useState<SymmyWebhookConfigInput>({
    endpoints: toFormEndpoints(config.endpoints),
    is_enabled: config.is_enabled,
  })
  const [isSaving, setIsSaving] = useState(false)

  const updateEndpoint = (
    key: string,
    patch: Partial<SymmyWebhookEndpoint>,
  ) => {
    setFormData((current) => ({
      ...current,
      endpoints: current.endpoints.map((endpoint) =>
        endpoint.key === key ? { ...endpoint, ...patch } : endpoint,
      ),
    }))
  }

  const addEndpoint = () => {
    setFormData((current) => ({
      ...current,
      endpoints: [...current.endpoints, createEmptyEndpoint()],
    }))
  }

  const removeEndpoint = (key: string) => {
    setFormData((current) => ({
      ...current,
      endpoints: current.endpoints.filter((endpoint) => endpoint.key !== key),
    }))
  }

  const saveConfig = async () => {
    const payload = {
      endpoints: formData.endpoints.flatMap((endpoint) => {
        const url = endpoint.url.trim()
        return url.length > 0 ? [{ enabled: endpoint.enabled, url }] : []
      }),
      is_enabled: formData.is_enabled,
    }

    setIsSaving(true)
    try {
      const response = await fetchJson("/admin/symmy-webhooks", {
        body: JSON.stringify(payload),
        method: "POST",
      })
      const savedConfig = parseConfigResponse(response)

      setFormData({
        endpoints: toFormEndpoints(savedConfig.endpoints),
        is_enabled: savedConfig.is_enabled,
      })
      toast.success("Symmy webhook configuration saved")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown request error"
      toast.error(`Failed to save webhook configuration: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Symmy Webhooks</Heading>
        <Text className="text-ui-fg-subtle">
          Product batch import completion notifications
        </Text>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          void saveConfig()
        }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="symmy-webhooks-enabled"
                id="symmy-webhooks-enabled-label"
              >
                Enable webhooks
              </Label>
              <Text
                className="text-sm text-ui-fg-subtle"
                id="symmy-webhooks-enabled-desc"
              >
                Send a POST request after a product batch import job completes
              </Text>
            </div>
            <Switch
              aria-describedby="symmy-webhooks-enabled-desc"
              aria-labelledby="symmy-webhooks-enabled-label"
              checked={formData.is_enabled}
              id="symmy-webhooks-enabled"
              onCheckedChange={(checked) => {
                setFormData((current) => ({
                  ...current,
                  is_enabled: checked,
                }))
              }}
            />
          </div>
        </div>

        <div className="border-t px-6 py-4">
          <div className="mb-4 flex items-center justify-between">
            <Heading level="h2">Endpoints</Heading>
            <Tooltip content="Add endpoint">
              <IconButton
                aria-label="Add endpoint"
                onClick={addEndpoint}
                type="button"
                variant="primary"
              >
                <Plus />
              </IconButton>
            </Tooltip>
          </div>

          <div className="flex flex-col gap-3">
            {formData.endpoints.map((endpoint) => {
              const inputId = `symmy-webhook-endpoint-${endpoint.key}`
              const switchId = `symmy-webhook-endpoint-enabled-${endpoint.key}`
              return (
                <div
                  className="grid grid-cols-[1fr_auto_auto] items-end gap-3"
                  key={endpoint.key}
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={inputId}>Webhook URL</Label>
                    <Input
                      id={inputId}
                      onChange={(event: ChangeEvent<HTMLInputElement>) => {
                        const { currentTarget } = event
                        const url =
                          "value" in currentTarget &&
                          typeof currentTarget.value === "string"
                            ? currentTarget.value
                            : ""
                        updateEndpoint(endpoint.key, { url })
                      }}
                      placeholder="https://example.com/webhooks/symmy"
                      type="url"
                      value={endpoint.url}
                    />
                  </div>
                  <div className="flex h-10 items-center gap-2">
                    <Label htmlFor={switchId}>Enabled</Label>
                    <Switch
                      checked={endpoint.enabled}
                      id={switchId}
                      onCheckedChange={(checked) => {
                        updateEndpoint(endpoint.key, { enabled: checked })
                      }}
                    />
                  </div>
                  <Tooltip content="Remove endpoint">
                    <IconButton
                      aria-label="Remove endpoint"
                      className="mb-0"
                      onClick={() => {
                        removeEndpoint(endpoint.key)
                      }}
                      type="button"
                      variant="transparent"
                    >
                      <Trash />
                    </IconButton>
                  </Tooltip>
                </div>
              )
            })}
          </div>
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <Button isLoading={isSaving} type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Container>
  )
}

const SymmyWebhooksSettingsPage = () => {
  const configState = useSyncExternalStore(
    subscribeToWebhookConfig,
    getWebhookConfigSnapshot,
    getWebhookConfigSnapshot,
  )

  if (configState.status === "loading") {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Symmy Webhooks</Heading>
        </div>
        <div className="px-6 py-4">
          <Text>Loading...</Text>
        </div>
      </Container>
    )
  }

  if (configState.status === "error") {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Symmy Webhooks</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            Error loading webhook configuration.
          </Text>
        </div>
      </Container>
    )
  }

  return <SymmyWebhooksForm config={configState.config} />
}

export const config = defineRouteConfig({
  label: "Symmy Webhooks",
})

export default SymmyWebhooksSettingsPage
