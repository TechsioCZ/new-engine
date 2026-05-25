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
import { type FormEvent, useEffect, useState } from "react"

type SymmyWebhookEndpoint = {
  url: string
  enabled: boolean
}

type SymmyWebhookConfigResponse = {
  id: string
  is_enabled: boolean
  endpoints: SymmyWebhookEndpoint[]
}

type SymmyWebhookConfigInput = {
  is_enabled: boolean
  endpoints: SymmyWebhookEndpoint[]
}

const fetchJson = async <T,>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(options?.headers ?? {}),
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

const createEmptyEndpoint = (): SymmyWebhookEndpoint => ({
  url: "",
  enabled: true,
})

const SymmyWebhooksSettingsPage = () => {
  const [formData, setFormData] = useState<SymmyWebhookConfigInput>({
    is_enabled: false,
    endpoints: [createEmptyEndpoint()],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await fetchJson<{ config: SymmyWebhookConfigResponse }>(
          "/admin/symmy-webhooks"
        )

        setFormData({
          is_enabled: data.config.is_enabled,
          endpoints: data.config.endpoints.length
            ? data.config.endpoints
            : [createEmptyEndpoint()],
        })
        setLoadError(null)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown request error"
        setLoadError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadConfig()
  }, [])

  const updateEndpoint = (
    index: number,
    patch: Partial<SymmyWebhookEndpoint>
  ) => {
    setFormData((current) => ({
      ...current,
      endpoints: current.endpoints.map((endpoint, endpointIndex) =>
        endpointIndex === index ? { ...endpoint, ...patch } : endpoint
      ),
    }))
  }

  const addEndpoint = () => {
    setFormData((current) => ({
      ...current,
      endpoints: [...current.endpoints, createEmptyEndpoint()],
    }))
  }

  const removeEndpoint = (index: number) => {
    setFormData((current) => ({
      ...current,
      endpoints: current.endpoints.filter(
        (_, endpointIndex) => endpointIndex !== index
      ),
    }))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    const payload = {
      is_enabled: formData.is_enabled,
      endpoints: formData.endpoints
        .map((endpoint) => ({
          url: endpoint.url.trim(),
          enabled: endpoint.enabled,
        }))
        .filter((endpoint) => endpoint.url.length > 0),
    }

    setIsSaving(true)
    try {
      const data = await fetchJson<{ config: SymmyWebhookConfigResponse }>(
        "/admin/symmy-webhooks",
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      )

      setFormData({
        is_enabled: data.config.is_enabled,
        endpoints: data.config.endpoints.length
          ? data.config.endpoints
          : [createEmptyEndpoint()],
      })
      toast.success("Symmy webhook configuration saved")
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown request error"
      toast.error(`Failed to save webhook configuration: ${message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
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

  if (loadError) {
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

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Symmy Webhooks</Heading>
        <Text className="text-ui-fg-subtle">
          Product batch import completion notifications
        </Text>
      </div>

      <form onSubmit={handleSubmit}>
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
              onCheckedChange={(checked) =>
                setFormData((current) => ({
                  ...current,
                  is_enabled: checked,
                }))
              }
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
            {formData.endpoints.map((endpoint, index) => {
              const inputId = `symmy-webhook-endpoint-${index}`
              const switchId = `symmy-webhook-endpoint-enabled-${index}`
              return (
                <div
                  className="grid grid-cols-[1fr_auto_auto] items-end gap-3"
                  // biome-ignore lint/suspicious/noArrayIndexKey: Endpoint rows are controlled by index and are only appended or removed.
                  key={index}
                >
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={inputId}>Webhook URL</Label>
                    <Input
                      id={inputId}
                      onChange={(event) =>
                        updateEndpoint(index, { url: event.target.value })
                      }
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
                      onCheckedChange={(checked) =>
                        updateEndpoint(index, { enabled: checked })
                      }
                    />
                  </div>
                  <Tooltip content="Remove endpoint">
                    <IconButton
                      aria-label="Remove endpoint"
                      className="mb-0"
                      onClick={() => removeEndpoint(index)}
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

export const config = defineRouteConfig({
  label: "Symmy Webhooks",
})

export default SymmyWebhooksSettingsPage
