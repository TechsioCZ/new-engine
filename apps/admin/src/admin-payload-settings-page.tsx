import { useQuery } from "@tanstack/react-query"
import { Button } from "@techsio/ui-kit/atoms/button"
import { useState } from "react"
import { fetchPayloadSsoHtml, usePayloadConfig } from "./admin-api"
import { MEDUSA_BACKEND_URL } from "./admin-config"

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
      return (
        <div aria-busy="true" className="admin-table-state">
          Nacitam Payload konfiguraci...
        </div>
      )
    }

    if (config.isError) {
      return (
        <div className="admin-table-state admin-table-state-error">
          Payload konfiguraci se nepodarilo nacist.
        </div>
      )
    }

    if (!iframeUrl) {
      return (
        <div className="admin-table-state admin-table-state-error">
          Payload iframe URL neni nastavene.
        </div>
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
    <section className="admin-page admin-page-full">
      <header className="admin-page-header">
        <div>
          <span className="admin-eyebrow">Nastaveni</span>
          <h1>Payload</h1>
        </div>
      </header>
      <div className="admin-panel admin-payload-panel">
        <div className="admin-panel-header">
          <div>
            <h2>Payload Admin</h2>
            <span>SSO vstup do CMS administrace pres Medusa backend.</span>
          </div>
        </div>
        {renderPayloadContent()}
      </div>
    </section>
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
      <Button
        className="admin-toolbar-button"
        onClick={onOpen}
        size="sm"
        theme="outlined"
        type="button"
        variant="secondary"
      >
        Otevrit Payload
      </Button>
      {feedback && (
        <div
          className={[
            "admin-feedback admin-feedback-inline",
            feedback.tone === "error" ? "admin-feedback-error" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {feedback.message}
        </div>
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
    return (
      <div aria-busy="true" className="admin-table-state">
        Pripravuji Payload SSO...
      </div>
    )
  }

  if (isError || !html) {
    return (
      <div className="admin-table-state admin-table-state-error">
        Payload SSO se nepodarilo pripravit.
      </div>
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
