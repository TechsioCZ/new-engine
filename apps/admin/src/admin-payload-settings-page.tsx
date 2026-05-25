import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
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

  async function openPayloadInNewTab() {
    setFeedback(null)

    const popup = window.open("about:blank", "_blank")

    if (!popup) {
      setFeedback({
        message: "Prohlizec zablokoval otevreni noveho tabu.",
        tone: "error",
      })
      return
    }

    try {
      const html = await fetchPayloadSsoHtml(returnTo)
      const url = URL.createObjectURL(
        new Blob([html], { type: "text/html;charset=utf-8" })
      )

      popup.location.href = url
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
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
          onOpen={openPayloadInNewTab}
        />
      )
    }

    return (
      <PayloadIframe
        html={ssoHtml.data}
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
    <div className="grid gap-7 p-8">
      <div>
        <h3 className="mt-0 mb-2 font-bold text-fg-primary text-sm leading-normal">
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
  isError,
  isLoading,
}: {
  html: string | undefined
  isError: boolean
  isLoading: boolean
}) {
  if (isLoading) {
    return <AdminState isBusy>Pripravuji Payload SSO...</AdminState>
  }

  if (isError || !html) {
    return (
      <AdminState tone="error">Payload SSO se nepodarilo pripravit.</AdminState>
    )
  }

  return (
    <iframe
      className="block min-h-admin-payload-frame w-full border-0 bg-base-reverse"
      srcDoc={html}
      title="Payload Admin"
    />
  )
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
