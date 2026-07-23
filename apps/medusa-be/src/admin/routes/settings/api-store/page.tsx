import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Drawer,
  FocusModal,
  Heading,
  Input,
  Label,
  Table,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import { sdk } from "../../../lib/sdk"

const PAGE_SIZE = 20

type ApiStoreConfig = {
  id: string
  name: string
  api_url: string | null
  has_api_key: boolean
  has_credentials: boolean
  created_at?: string
  updated_at?: string
}

type ApiStoreListResponse = {
  api_stores: ApiStoreConfig[]
  count: number
  limit: number
  offset: number
}

type ApiStoreResponse = {
  api_store: ApiStoreConfig
}

type ApiStoreCreatePayload = {
  name: string
  api_url?: string | null
  api_key?: string | null
  credentials?: Record<string, unknown> | null
}

type ApiStoreUpdatePayload = Partial<ApiStoreCreatePayload>

type ApiStoreFormState = {
  name: string
  api_url: string
  api_key: string
  credentials: string
}

type FormErrors = Partial<Record<keyof ApiStoreFormState, string>>

export const handle = {
  breadcrumb: () => "API Store",
}

const EMPTY_FORM: ApiStoreFormState = {
  name: "",
  api_url: "",
  api_key: "",
  credentials: "",
}

const parseCredentials = (value: string): Record<string, unknown> | null => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const parsed = JSON.parse(trimmed) as unknown
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Credentials must be a JSON object")
  }

  return parsed as Record<string, unknown>
}

const toOptionalString = (value: string): string | null => {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const SecretState = ({ isSet }: { isSet: boolean }) => (
  <Text
    className={isSet ? "text-ui-fg-base" : "text-ui-fg-subtle"}
    size="small"
  >
    {isSet ? "Set" : "Not set"}
  </Text>
)

const ApiStoreFormFields = ({
  apiStoreConfig,
  errors,
  form,
  mode,
  onChange,
  onClearApiKey,
  onClearCredentials,
  willClearApiKey,
  willClearCredentials,
}: {
  apiStoreConfig?: ApiStoreConfig | null
  errors: FormErrors
  form: ApiStoreFormState
  mode: "create" | "edit"
  onChange: (field: keyof ApiStoreFormState, value: string) => void
  onClearApiKey?: () => void
  onClearCredentials?: () => void
  willClearApiKey?: boolean
  willClearCredentials?: boolean
}) => (
  <div className="flex flex-col gap-4">
    <div className="flex flex-col gap-2">
      <Label htmlFor={`api-store-${mode}-name`}>Name *</Label>
      <Input
        id={`api-store-${mode}-name`}
        onChange={(event) => onChange("name", event.target.value)}
        placeholder="heureka"
        value={form.name}
      />
      {errors.name && (
        <Text className="text-ui-fg-error" size="small">
          {errors.name}
        </Text>
      )}
    </div>

    <div className="flex flex-col gap-2">
      <Label htmlFor={`api-store-${mode}-api-url`}>API URL</Label>
      <Input
        id={`api-store-${mode}-api-url`}
        onChange={(event) => onChange("api_url", event.target.value)}
        placeholder="https://example.com/export.xml"
        value={form.api_url}
      />
      {errors.api_url && (
        <Text className="text-ui-fg-error" size="small">
          {errors.api_url}
        </Text>
      )}
    </div>

    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`api-store-${mode}-api-key`}>
          API key{" "}
          {apiStoreConfig?.has_api_key && (
            <span className="text-ui-fg-subtle">(set)</span>
          )}
          {willClearApiKey && (
            <span className="text-ui-fg-error"> (will be cleared)</span>
          )}
        </Label>
        {mode === "edit" && apiStoreConfig?.has_api_key && !willClearApiKey && (
          <button
            className="text-sm text-ui-fg-subtle hover:text-ui-fg-error"
            onClick={onClearApiKey}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
      <Input
        disabled={willClearApiKey}
        id={`api-store-${mode}-api-key`}
        onChange={(event) => onChange("api_key", event.target.value)}
        placeholder={
          apiStoreConfig?.has_api_key ? "Leave empty to keep" : "API key"
        }
        type="password"
        value={willClearApiKey ? "" : form.api_key}
      />
      {errors.api_key && (
        <Text className="text-ui-fg-error" size="small">
          {errors.api_key}
        </Text>
      )}
    </div>

    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`api-store-${mode}-credentials`}>
          Credentials JSON{" "}
          {apiStoreConfig?.has_credentials && (
            <span className="text-ui-fg-subtle">(set)</span>
          )}
          {willClearCredentials && (
            <span className="text-ui-fg-error"> (will be cleared)</span>
          )}
        </Label>
        {mode === "edit" &&
          apiStoreConfig?.has_credentials &&
          !willClearCredentials && (
            <button
              className="text-sm text-ui-fg-subtle hover:text-ui-fg-error"
              onClick={onClearCredentials}
              type="button"
            >
              Clear
            </button>
          )}
      </div>
      <Textarea
        disabled={willClearCredentials}
        id={`api-store-${mode}-credentials`}
        onChange={(event) => onChange("credentials", event.target.value)}
        placeholder={
          apiStoreConfig?.has_credentials
            ? "Leave empty to keep"
            : '{"client_id":"...","client_secret":"..."}'
        }
        rows={6}
        value={willClearCredentials ? "" : form.credentials}
      />
      {errors.credentials && (
        <Text className="text-ui-fg-error" size="small">
          {errors.credentials}
        </Text>
      )}
      <Text className="text-ui-fg-subtle" size="small">
        API key and credentials are encrypted at rest and never displayed back.
      </Text>
    </div>
  </div>
)

const CreateApiStoreModal = () => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<ApiStoreFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})

  const createMutation = useMutation({
    mutationFn: (payload: ApiStoreCreatePayload) =>
      sdk.client.fetch<ApiStoreResponse>("/admin/api-store", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-store"] })
      toast.success("API store config created")
      setOpen(false)
      setForm(EMPTY_FORM)
      setErrors({})
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to create API store config"))
    },
  })

  const updateField = (field: keyof ApiStoreFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const name = form.name.trim()
    const apiKey = toOptionalString(form.api_key)
    let credentials: Record<string, unknown> | null = null

    if (!name) {
      nextErrors.name = "Name is required"
    }

    try {
      credentials = parseCredentials(form.credentials)
    } catch (error) {
      nextErrors.credentials = getErrorMessage(
        error,
        "Invalid credentials JSON"
      )
    }

    if (!(apiKey || credentials)) {
      nextErrors.api_key = "Fill API key or credentials"
      nextErrors.credentials = "Fill credentials or API key"
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    createMutation.mutate({
      name,
      api_url: toOptionalString(form.api_url),
      api_key: apiKey,
      credentials,
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

  if (!name) {
    errors.name = "Name is required"
  }

  const willHaveApiKey = clearApiKey
    ? false
    : !!apiKey || apiStoreConfig.has_api_key
  const willHaveCredentials = clearCredentials
    ? false
    : !!credentials || apiStoreConfig.has_credentials

  if (!(willHaveApiKey || willHaveCredentials)) {
    errors.api_key = "At least one secret must remain set"
    errors.credentials = "At least one secret must remain set"
  }

  if (Object.keys(errors).length > 0) {
    return { errors }
  }

  const payload: ApiStoreUpdatePayload = {
    name,
    api_url: toOptionalString(form.api_url),
  }

  if (apiKey) {
    payload.api_key = apiKey
  } else if (clearApiKey) {
    payload.api_key = null
  }

  if (credentials) {
    payload.credentials = credentials
  } else if (clearCredentials) {
    payload.credentials = null
  }

  return { errors, payload }
}

const parseOptionalCredentials = (
  value: string,
  errors: FormErrors
): Record<string, unknown> | null | undefined => {
  if (!value.trim()) {
    return
  }

  try {
    return parseCredentials(value)
  } catch (error) {
    errors.credentials = getErrorMessage(error, "Invalid credentials JSON")
    return
  }
}

const EditApiStoreDrawer = ({
  apiStoreConfig,
  onOpenChange,
  open,
}: {
  apiStoreConfig: ApiStoreConfig | null
  onOpenChange: (open: boolean) => void
  open: boolean
}) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<ApiStoreFormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [clearApiKey, setClearApiKey] = useState(false)
  const [clearCredentials, setClearCredentials] = useState(false)

  useEffect(() => {
    if (apiStoreConfig) {
      setForm({
        name: apiStoreConfig.name,
        api_url: apiStoreConfig.api_url ?? "",
        api_key: "",
        credentials: "",
      })
      setErrors({})
      setClearApiKey(false)
      setClearCredentials(false)
    }
  }, [apiStoreConfig])

  const updateMutation = useMutation({
    mutationFn: (payload: ApiStoreUpdatePayload) =>
      sdk.client.fetch<ApiStoreResponse>(
        `/admin/api-store/${apiStoreConfig?.id}`,
        {
          method: "POST",
          body: payload,
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-store"] })
      toast.success("API store config saved")
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to save API store config"))
    },
  })

  if (!apiStoreConfig) {
    return null
  }

  const updateField = (field: keyof ApiStoreFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
    if (field === "api_key") {
      setClearApiKey(false)
    }
    if (field === "credentials") {
      setClearCredentials(false)
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()

    const { errors: nextErrors, payload } = buildUpdatePayload({
      apiStoreConfig,
      clearApiKey,
      clearCredentials,
      form,
    })

    if (!payload) {
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
              onClearApiKey={() => setClearApiKey(true)}
              onClearCredentials={() => setClearCredentials(true)}
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
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => onEdit(apiStoreConfig)}
            size="small"
            variant="secondary"
          >
            Edit
          </Button>
          <Button
            disabled={isDeleting}
            onClick={() => onDelete(apiStoreConfig.id)}
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

const ApiStoreSettingsPage = () => {
  const queryClient = useQueryClient()
  const [offset, setOffset] = useState(0)
  const [selectedConfig, setSelectedConfig] = useState<ApiStoreConfig | null>(
    null
  )
  const [editOpen, setEditOpen] = useState(false)

  const { data, error, isLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<ApiStoreListResponse>(
        `/admin/api-store?limit=${PAGE_SIZE}&offset=${offset}`
      ),
    queryKey: ["api-store", PAGE_SIZE, offset],
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/api-store/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-store"] })
      toast.success("API store config deleted")
    },
    onError: (deleteError) => {
      toast.error(
        getErrorMessage(deleteError, "Failed to delete API store config")
      )
    },
  })

  const configs = data?.api_stores ?? []
  const count = data?.count ?? 0
  const canGoBack = offset > 0
  const canGoNext = offset + PAGE_SIZE < count

  const openEdit = (apiStoreConfig: ApiStoreConfig) => {
    setSelectedConfig(apiStoreConfig)
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
                onDelete={(id) => deleteMutation.mutate(id)}
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
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                size="small"
                variant="secondary"
              >
                Previous
              </Button>
              <Button
                disabled={!canGoNext || isLoading}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                size="small"
                variant="secondary"
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}

      <EditApiStoreDrawer
        apiStoreConfig={selectedConfig}
        onOpenChange={setEditOpen}
        open={editOpen}
      />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "API Store",
})

export default ApiStoreSettingsPage
