import { useQuery } from "@tanstack/react-query"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useState } from "react"
import { fetchPayloadSsoHtml, usePayloadConfig } from "./admin-api"
import { MEDUSA_BACKEND_URL } from "./admin-config"
import { AdminPage, AdminPageHeader } from "./components/admin-page-header"
import { AdminPanelHeader } from "./components/admin-panel-header"
import { AdminState } from "./components/admin-state"
import { AdminToolbarButton } from "./components/admin-toolbar-button"

type Feedback = {
  message: string
  tone: "error" | "success"
} | null

export function PayloadSettingsPage() {
  const config = usePayloadConfig()
  const [feedback, setFeedback] = useState<Feedback>(null)
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
      <div className="admin-panel admin-payload-panel">
        <AdminPanelHeader
          subtitle="SSO vstup do CMS administrace pres Medusa backend."
          title="Payload Admin"
        />
        {renderPayloadContent()}
      </div>
    </AdminPage>
  )
}

function PayloadNewTabLauncher({
  feedback,
  iframeUrl,
  onOpen,
}: {
  feedback: Feedback
  iframeUrl: string
  onOpen: () => void
}) {
  return (
    <div className="admin-payload-launch">
      <div>
        <h3>Payload se otevre v novem tabu</h3>
        <span>{iframeUrl}</span>
      </div>
      <AdminToolbarButton onClick={onOpen}>Otevrit Payload</AdminToolbarButton>
      {feedback && (
        <StatusText
          align="start"
          role={feedback.tone === "error" ? "alert" : "status"}
          showIcon
          size="sm"
          status={feedback.tone}
        >
          {feedback.message}
        </StatusText>
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
      className="admin-payload-frame"
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
