import type {
  NotificationTemplateInspector,
  NotificationTemplateRenderer,
} from "./contracts"

const RESEND_TEMPLATE_PATH = "/templates/"
const UNRESOLVED_TEMPLATE_EXPRESSION = /\{\{[\s\S]*?\}\}/u

type ResendTemplateSnapshot = Readonly<{
  html: string
  status: "published"
  subject: string
  text: string
}>

export type ResendTemplateInspectionOptions = Readonly<{
  apiKey: string
  apiUrl: string
  fetchImplementation?: typeof fetch
  requestTimeoutMs: number
}>

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parsePublishedTemplate = (value: unknown): ResendTemplateSnapshot => {
  if (
    !isRecord(value) ||
    value.object !== "template" ||
    value.status !== "published" ||
    typeof value.html !== "string" ||
    !value.html.trim() ||
    typeof value.subject !== "string" ||
    !value.subject.trim() ||
    typeof value.text !== "string" ||
    !value.text.trim()
  ) {
    throw new Error(
      "Resend template inspection did not return a published template with explicit subject, HTML, and text bodies"
    )
  }
  return {
    html: value.html,
    status: "published",
    subject: value.subject,
    text: value.text,
  }
}

const parseResponseBody = async (response: Response): Promise<unknown> => {
  try {
    return (await response.json()) as unknown
  } catch {
    throw new Error("Resend template inspection returned malformed JSON")
  }
}

const escapeRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")

const templateVariableValue = (value: unknown): string => {
  if (typeof value === "string") {
    return value
  }
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return String(value)
  }
  return JSON.stringify(value)
}

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/gu, (character) => {
    const entities: Record<string, string> = {
      '"': "&quot;",
      "&": "&amp;",
      "'": "&#39;",
      "<": "&lt;",
      ">": "&gt;",
    }
    return entities[character] as string
  })

const renderTemplateSource = (
  source: string,
  variables: Readonly<Record<string, unknown>>,
  html: boolean
): string => {
  let rendered = source
  for (const [key, value] of Object.entries(variables)) {
    const escapedKey = escapeRegularExpression(key)
    const replacement = templateVariableValue(value)
    rendered = rendered
      .replace(
        new RegExp(`\\{\\{\\{\\s*${escapedKey}\\s*\\}\\}\\}`, "gu"),
        () => replacement
      )
      .replace(new RegExp(`\\{\\{\\s*${escapedKey}\\s*\\}\\}`, "gu"), () =>
        html ? escapeHtml(replacement) : replacement
      )
  }
  if (UNRESOLVED_TEMPLATE_EXPRESSION.test(rendered)) {
    throw new Error(
      "Resend template inspection found an unresolved template expression"
    )
  }
  return rendered
}

export const createResendTemplateInspectionAdapter = (
  options: ResendTemplateInspectionOptions
): Readonly<{
  inspector: NotificationTemplateInspector
  renderer: NotificationTemplateRenderer
}> => {
  const apiKey = options.apiKey.trim()
  const apiUrl = options.apiUrl.trim()
  if (!(apiKey && apiUrl)) {
    throw new Error("Resend template inspection requires runtime credentials")
  }
  if (
    !Number.isSafeInteger(options.requestTimeoutMs) ||
    options.requestTimeoutMs <= 0
  ) {
    throw new Error(
      "Resend template inspection timeout must be a positive integer"
    )
  }
  const request = options.fetchImplementation ?? fetch
  const snapshots = new Map<string, Promise<ResendTemplateSnapshot>>()

  const retrieve = (templateId: string): Promise<ResendTemplateSnapshot> => {
    const normalizedTemplateId = templateId.trim()
    if (!normalizedTemplateId) {
      throw new Error("Resend template inspection requires a template id")
    }
    const cached = snapshots.get(normalizedTemplateId)
    if (cached) {
      return cached
    }
    const pending = (async () => {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(),
        options.requestTimeoutMs
      )
      try {
        const response = await request(
          `${apiUrl}${RESEND_TEMPLATE_PATH}${encodeURIComponent(normalizedTemplateId)}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            method: "GET",
            signal: controller.signal,
          }
        )
        const body = await parseResponseBody(response)
        if (!response.ok) {
          throw new Error(
            `Resend template inspection failed with status ${response.status}`
          )
        }
        return parsePublishedTemplate(body)
      } finally {
        clearTimeout(timeout)
      }
    })()
    snapshots.set(normalizedTemplateId, pending)
    return pending
  }

  return {
    inspector: {
      inspect: async ({ templateId }) => ({
        published: (await retrieve(templateId)).status === "published",
      }),
    },
    renderer: {
      render: async ({ templateId, variables }) => {
        const snapshot = await retrieve(templateId)
        return {
          html: renderTemplateSource(snapshot.html, variables, true),
          subject: renderTemplateSource(snapshot.subject, variables, false),
          text: renderTemplateSource(snapshot.text, variables, false),
        }
      },
    },
  }
}
