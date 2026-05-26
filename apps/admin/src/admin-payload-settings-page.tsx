import { useQuery } from "@tanstack/react-query"
import { useEffect, useId, useMemo, useRef, useState } from "react"
import { fetchPayloadSsoHtml, usePayloadConfig } from "./admin-api"
import { MEDUSA_BACKEND_URL } from "./admin-config"
import {
  AdminFeedback,
  type AdminFeedbackState,
} from "./components/admin-feedback"
import { AdminPage, AdminPageHeader } from "./components/admin-page-header"
import { AdminPanel } from "./components/admin-panel"
import { AdminPanelHeader } from "./components/admin-panel-header"
import { AdminState } from "./components/admin-state"
import { AdminToolbarButton } from "./components/admin-toolbar-button"

const LOCAL_PAYLOAD_PORT = "8083"
const PAYLOAD_SSO_PATHNAME = "/api/medusa-sso"
const LOCAL_PAYLOAD_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "admin.payload.medusa.localhost",
])

export function PayloadSettingsPage() {
  const config = usePayloadConfig()
  const [feedback, setFeedback] = useState<AdminFeedbackState>(null)
  const iframeUrl = config.data?.iframeUrl
  const returnTo = getPayloadReturnTo(iframeUrl)
  const ssoHtml = useQuery({
    enabled: Boolean(iframeUrl && config.data?.isIframeEnabled),
    queryFn: () => fetchPayloadSsoHtml(returnTo),
    queryKey: ["payload-sso-html", MEDUSA_BACKEND_URL, returnTo],
  })

  async function openPayloadInNewTab(payloadIframeUrl: string) {
    setFeedback(null)

    const targetName = `payload-admin-${Date.now()}`
    const popup = window.open("about:blank", targetName)

    if (!popup) {
      setFeedback({
        message: "Prohlizec zablokoval otevreni noveho tabu.",
        tone: "error",
      })
      return
    }

    try {
      const html = await fetchPayloadSsoHtml(returnTo)
      const form = parsePayloadSsoForm(html, payloadIframeUrl)

      if (!form) {
        throw new Error("Payload SSO odpoved nema platny formular.")
      }

      popup.opener = null
      submitPayloadSsoForm(form, targetName)
      setFeedback({
        message: "Payload Admin se otevira v novem tabu.",
        tone: "success",
      })
    } catch (error) {
      popup.close()
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "Payload SSO se nepodarilo pripravit.",
        tone: "error",
      })
    }
  }

  function renderPayloadContent() {
    if (config.isLoading) {
      return <AdminState isBusy>Nacitam Payload konfiguraci...</AdminState>
    }

    if (config.isError) {
      return (
        <AdminState tone="error">
          Payload konfiguraci se nepodarilo nacist.
        </AdminState>
      )
    }

    if (!iframeUrl) {
      return (
        <AdminState tone="error">Payload iframe URL neni nastavene.</AdminState>
      )
    }

    if (!config.data?.isIframeEnabled) {
      return (
        <PayloadNewTabLauncher
          feedback={feedback}
          iframeUrl={iframeUrl}
          onOpen={() => openPayloadInNewTab(iframeUrl)}
        />
      )
    }

    return (
      <PayloadIframe
        html={ssoHtml.data}
        iframeUrl={iframeUrl}
        isError={ssoHtml.isError}
        isLoading={ssoHtml.isLoading}
      />
    )
  }

  return (
    <AdminPage width="full">
      <AdminPageHeader eyebrow="Nastaveni" title="Payload" />
      <AdminPanel as="div" className="min-h-admin-payload-panel">
        <AdminPanelHeader
          subtitle="SSO vstup do CMS administrace pres Medusa backend."
          title="Payload Admin"
        />
        {renderPayloadContent()}
      </AdminPanel>
    </AdminPage>
  )
}

function PayloadNewTabLauncher({
  feedback,
  iframeUrl,
  onOpen,
}: {
  feedback: AdminFeedbackState
  iframeUrl: string
  onOpen: () => void
}) {
  return (
    <div className="grid gap-350 p-400">
      <div>
        <h3 className="mt-0 mb-100 font-bold text-fg-primary text-sm leading-normal">
          Payload se otevre v novem tabu
        </h3>
        <span className="text-fg-secondary text-xs leading-normal [overflow-wrap:anywhere]">
          {iframeUrl}
        </span>
      </div>
      <AdminToolbarButton onClick={onOpen}>Otevrit Payload</AdminToolbarButton>
      {feedback && (
        <AdminFeedback tone={feedback.tone}>{feedback.message}</AdminFeedback>
      )}
    </div>
  )
}

function PayloadIframe({
  html,
  iframeUrl,
  isError,
  isLoading,
}: {
  html: string | undefined
  iframeUrl: string
  isError: boolean
  isLoading: boolean
}) {
  const frameName = usePayloadFrameName()
  const submittedFormKey = useRef<string | null>(null)
  const ssoForm = useMemo(
    () => (html ? parsePayloadSsoForm(html, iframeUrl) : null),
    [html, iframeUrl]
  )

  useEffect(() => {
    if (!ssoForm) {
      return
    }

    if (submittedFormKey.current === ssoForm.key) {
      return
    }

    submittedFormKey.current = ssoForm.key
    submitPayloadSsoForm(ssoForm, frameName)
  }, [frameName, ssoForm])

  if (isLoading) {
    return <AdminState isBusy>Pripravuji Payload SSO...</AdminState>
  }

  if (isError || !html || !ssoForm) {
    return (
      <AdminState tone="error">Payload SSO se nepodarilo pripravit.</AdminState>
    )
  }

  return (
    <iframe
      className="block min-h-admin-payload-frame w-full border-0 bg-base-reverse"
      name={frameName}
      referrerPolicy="origin"
      title="Payload Admin"
    />
  )
}

function usePayloadFrameName() {
  return `payload-admin-frame-${useId().replaceAll(":", "")}`
}

type PayloadSsoForm = {
  action: string
  fields: Array<{
    name: string
    value: string
  }>
  key: string
}

function parsePayloadSsoForm(
  html: string,
  iframeUrl: string
): PayloadSsoForm | null {
  const document = new DOMParser().parseFromString(html, "text/html")
  const form = document.querySelector("form")
  const action = form?.getAttribute("action")

  if (!(form && action)) {
    return null
  }

  const actionUrl = parseUrl(action, window.location.href)
  const payloadIframeUrl = parseUrl(iframeUrl)

  if (
    !(
      actionUrl &&
      payloadIframeUrl &&
      actionUrl.pathname === PAYLOAD_SSO_PATHNAME &&
      isAllowedPayloadSsoAction(actionUrl, payloadIframeUrl)
    )
  ) {
    return null
  }

  const fields = Array.from(form.querySelectorAll("input"))
    .map((input) => ({
      name: input.getAttribute("name") ?? "",
      value: input.getAttribute("value") ?? "",
    }))
    .filter((field) => field.name)

  if (!fields.some((field) => field.name === "token")) {
    return null
  }

  return {
    action: actionUrl.toString(),
    fields,
    key: `${actionUrl.toString()}:${fields
      .map((field) => `${field.name}=${field.value}`)
      .join("&")}`,
  }
}

function parseUrl(value: string, base?: string) {
  try {
    return new URL(value, base)
  } catch {
    return null
  }
}

function isAllowedPayloadSsoAction(actionUrl: URL, payloadIframeUrl: URL) {
  return getAllowedPayloadSsoOrigins(payloadIframeUrl).has(actionUrl.origin)
}

function getAllowedPayloadSsoOrigins(payloadIframeUrl: URL) {
  const origins = new Set([payloadIframeUrl.origin])

  if (!LOCAL_PAYLOAD_HOSTS.has(payloadIframeUrl.hostname)) {
    return origins
  }

  const currentHostname = window.location.hostname

  if (currentHostname === "localhost" || currentHostname === "127.0.0.1") {
    const localUrl = new URL(payloadIframeUrl.toString())
    localUrl.protocol = "http:"
    localUrl.hostname = currentHostname
    localUrl.port = localUrl.port || LOCAL_PAYLOAD_PORT
    origins.add(localUrl.origin)
  }

  if (currentHostname === "admin.medusa.localhost") {
    const localUrl = new URL(payloadIframeUrl.toString())
    localUrl.protocol = "https:"
    localUrl.hostname = "admin.payload.medusa.localhost"
    localUrl.port = ""
    origins.add(localUrl.origin)
  }

  return origins
}

function submitPayloadSsoForm(form: PayloadSsoForm, targetName: string) {
  const element = document.createElement("form")
  element.action = form.action
  element.hidden = true
  element.method = "post"
  element.target = targetName

  for (const field of form.fields) {
    const input = document.createElement("input")
    input.name = field.name
    input.type = "hidden"
    input.value = field.value
    element.appendChild(input)
  }

  document.body.appendChild(element)
  element.submit()
  element.remove()
}

function getPayloadReturnTo(iframeUrl: string | null | undefined) {
  if (!iframeUrl) {
    return "/"
  }

  try {
    const parsed = new URL(iframeUrl)
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`
    return path.startsWith("/") ? path : "/"
  } catch {
    return "/"
  }
}
