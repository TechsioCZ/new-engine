import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Drawer,
  FocusModal,
  Heading,
  Input,
  Label,
  Switch,
  Table,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { isRecord, omitKeys } from "@techsio/std/object"
import type { SubmitEvent } from "react"
import { useState } from "react"

import { sdk } from "../../../lib/sdk"

const PAGE_SIZE = 20

interface ApiStoreConfig {
  id: string
  name: string
  api_url: string | null
  has_api_key: boolean
  has_credentials: boolean
  enabled: boolean
  created_at?: string
  updated_at?: string
}

interface ApiStoreListResponse {
  api_stores: ApiStoreConfig[]
  count: number
  limit: number
  offset: number
}

interface ApiStoreResponse {
  api_store: ApiStoreConfig
}

interface ApiStoreCreatePayload {
  name: string
  api_url?: string | null
  api_key?: string | null
  credentials?: Record<string, unknown> | null
  enabled?: boolean
}

type ApiStoreUpdatePayload = Partial<ApiStoreCreatePayload>

interface ApiStoreFormState {
  name: string
  api_url: string
  api_key: string
  credentials: string
  enabled: boolean
}

type ApiStoreFormField = keyof ApiStoreFormState

type ApiStoreFormMode = "create" | "edit"

type FormErrors = Partial<Record<ApiStoreFormField, string>>

type FieldChangeHandler = <K extends ApiStoreFormField>(
  field: K,
  value: ApiStoreFormState[K],
) => void

export const handle = {
  breadcrumb: () => "API Store",
}

const EMPTY_FORM: ApiStoreFormState = {
  api_key: "",
  api_url: "",
  credentials: "",
  enabled: true,
  name: "",
}

const parseCredentials = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim()
  if (trimmed === "") {
    return null
  }

  const parsed: unknown = JSON.parse(trimmed)
  if (!isRecord(parsed)) {
    throw new Error("Credentials must be a JSON object")
  }

  return parsed
}

const toOptionalString = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed === "" ? null : trimmed
}

const getApiStoreDisplayErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const parseOptionalCredentials = (
  value: string,
  errors: FormErrors,
): Record<string, unknown> | null => {
  if (value.trim() === "") {
    return null
  }

  try {
    return parseCredentials(value)
  } catch (error) {
    errors.credentials = getApiStoreDisplayErrorMessage(
      error,
      "Invalid credentials JSON",
    )
    return null
  }
}

const FieldError = ({ message }: { message: string | undefined }) => {
  if (message === undefined || message === "") {
    return null
  }

  return (
    <Text className="text-ui-fg-error" size="small">
      {message}
    </Text>
  )
}

const SecretState = ({ isSet }: { isSet: boolean }) => (
  <Text
    className={isSet ? "text-ui-fg-base" : "text-ui-fg-subtle"}
    size="small"
  >
    {isSet ? "Set" : "Not set"}
  </Text>
)

const ApiKeyField = ({
  error,
  isSet,
  mode,
  onChange,
  onClear,
  value,
  willClear,
}: {
  error: string | undefined
  isSet: boolean
  mode: ApiStoreFormMode
  onChange: (next: string) => void
  onClear: (() => void) | undefined
  value: string
  willClear: boolean
}) => {
  const inputId = `api-store-${mode}-api-key`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={inputId}>
          API key {isSet && <span className="text-ui-fg-subtle">(set)</span>}
          {willClear && (
            <span className="text-ui-fg-error"> (will be cleared)</span>
          )}
        </Label>
        {mode === "edit" && isSet && !willClear && (
          <button
            className="text-sm text-ui-fg-subtle hover:text-ui-fg-error"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
      <Input
        disabled={willClear}
        id={inputId}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder={isSet ? "Leave empty to keep" : "API key"}
        type="password"
        value={willClear ? "" : value}
      />
      <FieldError message={error} />
    </div>
  )
}

const CredentialsField = ({
  error,
  isSet,
  mode,
  onChange,
  onClear,
  value,
  willClear,
}: {
  error: string | undefined
  isSet: boolean
  mode: ApiStoreFormMode
  onChange: (next: string) => void
  onClear: (() => void) | undefined
  value: string
  willClear: boolean
}) => {
  const inputId = `api-store-${mode}-credentials`

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={inputId}>
          Credentials JSON{" "}
          {isSet && <span className="text-ui-fg-subtle">(set)</span>}
          {willClear && (
            <span className="text-ui-fg-error"> (will be cleared)</span>
          )}
        </Label>
        {mode === "edit" && isSet && !willClear && (
          <button
            className="text-sm text-ui-fg-subtle hover:text-ui-fg-error"
            onClick={onClear}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
      <Textarea
        disabled={willClear}
        id={inputId}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        placeholder={
          isSet
            ? "Leave empty to keep"
            : '{"client_id":"...","client_secret":"..."}'
        }
        rows={6}
        value={willClear ? "" : value}
      />
      <FieldError message={error} />
      <Text className="text-ui-fg-subtle" size="small">
        API key and credentials are encrypted at rest and never displayed back.
      </Text>
    </div>
  )
}

const ApiStoreFormFields = ({
  apiStoreConfig,
  errors,
  form,
  mode,
  onChange,
  onClearApiKey,
  onClearCredentials,
  willClearApiKey = false,
  willClearCredentials = false,
}: {
  apiStoreConfig?: ApiStoreConfig | undefined
  errors: FormErrors
  form: ApiStoreFormState
  mode: ApiStoreFormMode
  onChange: FieldChangeHandler
  onClearApiKey?: (() => void) | undefined
  onClearCredentials?: (() => void) | undefined
  willClearApiKey?: boolean | undefined
  willClearCredentials?: boolean | undefined
}) => (
  <div className="flex flex-col gap-4">
    <div className="flex items-center justify-between gap-4 rounded-rounded border border-ui-border-base px-4 py-3">
      <div className="flex flex-col gap-1">
        <Label htmlFor={`api-store-${mode}-enabled`}>Enabled</Label>
        <Text className="text-ui-fg-subtle" size="small">
          Runtime integrations read this value on each operation.
        </Text>
      </div>
      <Switch
        checked={form.enabled}
        id={`api-store-${mode}-enabled`}
        onCheckedChange={(checked) => {
          onChange("enabled", checked)
        }}
      />
    </div>

    <div className="flex flex-col gap-2">
      <Label htmlFor={`api-store-${mode}-name`}>Name *</Label>
      <Input
        id={`api-store-${mode}-name`}
        onChange={(event) => {
          onChange("name", event.target.value)
        }}
        placeholder="heureka"
        value={form.name}
      />
      <FieldError message={errors.name} />
    </div>

    <div className="flex flex-col gap-2">
      <Label htmlFor={`api-store-${mode}-api-url`}>API URL</Label>
      <Input
        id={`api-store-${mode}-api-url`}
        onChange={(event) => {
          onChange("api_url", event.target.value)
        }}
        placeholder="https://example.com/export.xml"
        value={form.api_url}
      />
      <FieldError message={errors.api_url} />
    </div>

    <ApiKeyField
      error={errors.api_key}
      isSet={apiStoreConfig?.has_api_key === true}
      mode={mode}
      onChange={(next) => {
        onChange("api_key", next)
      }}
      onClear={onClearApiKey}
      value={form.api_key}
      willClear={willClearApiKey}
    />

    <CredentialsField
      error={errors.credentials}
      isSet={apiStoreConfig?.has_credentials === true}
      mode={mode}
      onChange={(next) => {
        onChange("credentials", next)
      }}
      onClear={onClearCredentials}
      value={form.credentials}
      willClear={willClearCredentials}
    />
  </div>
)

const CreateApiStoreModal = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ApiStoreFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  const createMutation = useMutation({
    mutationFn: async (payload: ApiStoreCreatePayload) =>
      await sdk.client.fetch<ApiStoreResponse>("/admin/api-store", {
        body: payload,
        method: "POST",
      }),
    onError: (error) => {
      toast.error(
        getApiStoreDisplayErrorMessage(
          error,
          "Failed to create API store config",
        ),
      )
    },
    // The visible effects stay ahead of the awaited invalidation so the modal
    // closes in the same tick as before.
    onSuccess: async () => {
      toast.success("API store config created")
      setOpen(false)
      setForm(EMPTY_FORM)
      setErrors({})
      await queryClient.invalidateQueries({ queryKey: ["api-store"] })
    },
  })

  const updateField = <K extends ApiStoreFormField>(
    field: K,
    value: ApiStoreFormState[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => omitKeys(previous, [field]))
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const name = form.name.trim()
    const apiKey = toOptionalString(form.api_key)
    let credentials: Record<string, unknown> | null = null

    if (name === "") {
      nextErrors.name = "Name is required"
    }

    try {
      credentials = parseCredentials(form.credentials)
    } catch (error) {
      nextErrors.credentials = getApiStoreDisplayErrorMessage(
        error,
        "Invalid credentials JSON",
      )
    }

    if (apiKey === null && credentials === null) {
      nextErrors.api_key = "Fill API key or credentials"
      nextErrors.credentials = "Fill credentials or API key"
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    createMutation.mutate({
      api_key: apiKey,
      api_url: toOptionalString(form.api_url),
      credentials,
      enabled: form.enabled,
      name,
    })
  }

  return (
    <FocusModal onOpenChange={setOpen} open={open}>
      <FocusModal.Trigger asChild>
        <Button size="small">Create</Button>
      </FocusModal.Trigger>
      <FocusModal.Content>
        <form
          className="flex h-full flex-col overflow-hidden"
          onSubmit={handleSubmit}
        >
          <FocusModal.Header>
            <div className="flex items-center justify-end gap-x-2">
              <FocusModal.Close asChild>
                <Button
                  disabled={createMutation.isPending}
                  size="small"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </FocusModal.Close>
              <Button
                isLoading={createMutation.isPending}
                size="small"
                type="submit"
              >
                Save
              </Button>
            </div>
          </FocusModal.Header>
          <FocusModal.Body className="flex-1 overflow-auto">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-8">
              <div>
                <Heading level="h1">Create API store config</Heading>
                <Text className="text-ui-fg-subtle" size="small">
                  Store provider credentials for backend-only integrations.
                </Text>
              </div>
              <ApiStoreFormFields
                errors={errors}
                form={form}
                mode="create"
                onChange={updateField}
              />
            </div>
          </FocusModal.Body>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}

const buildUpdatePayload = ({
  apiStoreConfig,
  clearApiKey,
  clearCredentials,
  form,
}: {
  apiStoreConfig: ApiStoreConfig
  clearApiKey: boolean
  clearCredentials: boolean
  form: ApiStoreFormState
}): { errors: FormErrors; payload?: ApiStoreUpdatePayload } => {
  const errors: FormErrors = {}
  const name = form.name.trim()
  const apiKey = toOptionalString(form.api_key)
  const credentials = parseOptionalCredentials(form.credentials, errors)

  if (name === "") {
    errors.name = "Name is required"
  }

  const willHaveApiKey = clearApiKey
    ? false
    : apiKey !== null || apiStoreConfig.has_api_key
  const willHaveCredentials = clearCredentials
    ? false
    : credentials !== null || apiStoreConfig.has_credentials

  if (!(willHaveApiKey || willHaveCredentials)) {
    errors.api_key = "At least one secret must remain set"
    errors.credentials = "At least one secret must remain set"
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const payload: ApiStoreUpdatePayload = {
    api_url: toOptionalString(form.api_url),
    enabled: form.enabled,
    name,
  }

  if (apiKey !== null) {
    payload.api_key = apiKey
  } else if (clearApiKey) {
    payload.api_key = null
  }

  if (credentials !== null) {
    payload.credentials = credentials
  } else if (clearCredentials) {
    payload.credentials = null
  }

  return { errors, payload }
}

const EditApiStoreForm = ({
  apiStoreConfig,
  onOpenChange,
  open,
}: {
  apiStoreConfig: ApiStoreConfig
  onOpenChange: (next: boolean) => void
  open: boolean
}) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ApiStoreFormState>(() => ({
    api_key: "",
    api_url: apiStoreConfig.api_url ?? "",
    credentials: "",
    enabled: apiStoreConfig.enabled,
    name: apiStoreConfig.name,
  }))
  const [errors, setErrors] = useState<FormErrors>({})
  const [clearApiKey, setClearApiKey] = useState(false)
  const [clearCredentials, setClearCredentials] = useState(false)

  const updateMutation = useMutation({
    mutationFn: async (payload: ApiStoreUpdatePayload) =>
      await sdk.client.fetch<ApiStoreResponse>(
        `/admin/api-store/${apiStoreConfig.id}`,
        {
          body: payload,
          method: "POST",
        },
      ),
    onError: (error) => {
      toast.error(
        getApiStoreDisplayErrorMessage(
          error,
          "Failed to save API store config",
        ),
      )
    },
    // The visible effects stay ahead of the awaited invalidation so the drawer
    // closes in the same tick as before.
    onSuccess: async () => {
      toast.success("API store config saved")
      onOpenChange(false)
      await queryClient.invalidateQueries({ queryKey: ["api-store"] })
    },
  })

  const updateField = <K extends ApiStoreFormField>(
    field: K,
    value: ApiStoreFormState[K],
  ) => {
    setForm((previous) => ({ ...previous, [field]: value }))
    setErrors((previous) => omitKeys(previous, [field]))
    if (field === "api_key") {
      setClearApiKey(false)
    }
    if (field === "credentials") {
      setClearCredentials(false)
    }
  }

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()

    const { errors: nextErrors, payload } = buildUpdatePayload({
      apiStoreConfig,
      clearApiKey,
      clearCredentials,
      form,
    })

    if (payload === undefined) {
      setErrors(nextErrors)
      return
    }

    updateMutation.mutate(payload)
  }

  return (
    <Drawer onOpenChange={onOpenChange} open={open}>
      <Drawer.Content>
        <form className="flex h-full flex-col" onSubmit={handleSubmit}>
          <Drawer.Header>
            <Drawer.Title>Edit API store config</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex-1 overflow-auto p-4">
            <ApiStoreFormFields
              apiStoreConfig={apiStoreConfig}
              errors={errors}
              form={form}
              mode="edit"
              onChange={updateField}
              onClearApiKey={() => {
                setClearApiKey(true)
              }}
              onClearCredentials={() => {
                setClearCredentials(true)
              }}
              willClearApiKey={clearApiKey}
              willClearCredentials={clearCredentials}
            />
          </Drawer.Body>
          <Drawer.Footer>
            <div className="flex items-center justify-end gap-x-2">
              <Drawer.Close asChild>
                <Button
                  disabled={updateMutation.isPending}
                  size="small"
                  variant="secondary"
                >
                  Cancel
                </Button>
              </Drawer.Close>
              <Button
                isLoading={updateMutation.isPending}
                size="small"
                type="submit"
              >
                Save
              </Button>
            </div>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}

const ApiStoreTableRows = ({
  configs,
  isDeleting,
  isLoading,
  onDelete,
  onEdit,
}: {
  configs: ApiStoreConfig[]
  isDeleting: boolean
  isLoading: boolean
  onDelete: (id: string) => void
  onEdit: (apiStoreConfig: ApiStoreConfig) => void
}) => {
  if (isLoading) {
    return (
      <Table.Row>
        <Table.Cell>Loading...</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  if (configs.length === 0) {
    return (
      <Table.Row>
        <Table.Cell>No API store configs yet.</Table.Cell>
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
        <Table.Cell />
      </Table.Row>
    )
  }

  return configs.map((apiStoreConfig) => (
    <Table.Row key={apiStoreConfig.id}>
      <Table.Cell>
        <Text size="small" weight="plus">
          {apiStoreConfig.name}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <Text className="text-ui-fg-subtle" size="small">
          {apiStoreConfig.api_url ?? "-"}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <SecretState isSet={apiStoreConfig.has_api_key} />
      </Table.Cell>
      <Table.Cell>
        <SecretState isSet={apiStoreConfig.has_credentials} />
      </Table.Cell>
      <Table.Cell>
        <Text
          className={
            apiStoreConfig.enabled ? "text-ui-fg-base" : "text-ui-fg-subtle"
          }
          size="small"
        >
          {apiStoreConfig.enabled ? "Enabled" : "Disabled"}
        </Text>
      </Table.Cell>
      <Table.Cell>
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              onEdit(apiStoreConfig)
            }}
            size="small"
            variant="secondary"
          >
            Edit
          </Button>
          <Button
            disabled={isDeleting}
            onClick={() => {
              onDelete(apiStoreConfig.id)
            }}
            size="small"
            variant="danger"
          >
            Delete
          </Button>
        </div>
      </Table.Cell>
    </Table.Row>
  ))
}

/**
 * The edit form seeds its state on mount, so it is remounted through `token`
 * whenever a different config object is selected. Re-selecting the very same
 * object keeps the pending draft, while any refreshed object discards it
 * together with the secrets typed into the form.
 */
interface EditSelection {
  config: ApiStoreConfig
  token: number
}

const ApiStoreSettingsPage = () => {
  const queryClient = useQueryClient()
  const [offset, setOffset] = useState(0)
  const [selection, setSelection] = useState<EditSelection | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  const { data, error, isLoading } = useQuery({
    queryFn: async () =>
      await sdk.client.fetch<ApiStoreListResponse>(
        `/admin/api-store?limit=${PAGE_SIZE}&offset=${offset}`,
      ),
    queryKey: ["api-store", PAGE_SIZE, offset],
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) =>
      await sdk.client.fetch(`/admin/api-store/${id}`, {
        method: "DELETE",
      }),
    onError: (deleteError) => {
      toast.error(
        getApiStoreDisplayErrorMessage(
          deleteError,
          "Failed to delete API store config",
        ),
      )
    },
    onSuccess: async () => {
      toast.success("API store config deleted")
      await queryClient.invalidateQueries({ queryKey: ["api-store"] })
    },
  })

  const configs = data?.api_stores ?? []
  const count = data?.count ?? 0
  const canGoBack = offset > 0
  const canGoNext = offset + PAGE_SIZE < count

  const openEdit = (apiStoreConfig: ApiStoreConfig) => {
    setSelection((previous) =>
      previous !== null && previous.config === apiStoreConfig
        ? previous
        : { config: apiStoreConfig, token: (previous?.token ?? 0) + 1 },
    )
    setEditOpen(true)
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">API Store</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Manage encrypted provider credentials used by backend integrations.
          </Text>
        </div>
        <CreateApiStoreModal />
      </div>

      {error ? (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            Error loading API store configs.
          </Text>
        </div>
      ) : (
        <>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Name</Table.HeaderCell>
                <Table.HeaderCell>API URL</Table.HeaderCell>
                <Table.HeaderCell>API key</Table.HeaderCell>
                <Table.HeaderCell>Credentials</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell className="text-right">
                  Actions
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              <ApiStoreTableRows
                configs={configs}
                isDeleting={deleteMutation.isPending}
                isLoading={isLoading}
                onDelete={(id) => {
                  deleteMutation.mutate(id)
                }}
                onEdit={openEdit}
              />
            </Table.Body>
          </Table>

          <div className="flex items-center justify-between px-6 py-4">
            <Text className="text-ui-fg-subtle" size="small">
              Showing {configs.length ? offset + 1 : 0}-
              {Math.min(offset + configs.length, count)} of {count}
            </Text>
            <div className="flex gap-2">
              <Button
                disabled={!canGoBack || isLoading}
                onClick={() => {
                  setOffset(Math.max(0, offset - PAGE_SIZE))
                }}
                size="small"
                variant="secondary"
              >
                Previous
              </Button>
              <Button
                disabled={!canGoNext || isLoading}
                onClick={() => {
                  setOffset(offset + PAGE_SIZE)
                }}
                size="small"
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      {selection !== null && (
        <EditApiStoreForm
          apiStoreConfig={selection.config}
          key={selection.token}
          onOpenChange={setEditOpen}
          open={editOpen}
        />
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "API Store",
})

export default ApiStoreSettingsPage
