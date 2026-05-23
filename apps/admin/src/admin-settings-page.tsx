import { useMutation, useQueryClient } from "@tanstack/react-query"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { type FormEvent, useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { updateQrPaymentConfig, useQrPaymentConfig } from "./admin-api"
import { AdminTextField } from "./components/admin-text-field"
import { AdminToolbarButton } from "./components/admin-toolbar-button"

type Feedback = {
  message: string
  tone: "error" | "success"
} | null

const settingsItems = [
  {
    description: "IBAN pro QR kod manualnich plateb.",
    href: "/settings/qr-payments",
    label: "QR platby",
  },
  {
    description: "Konfigurace dopravce a odesilatele.",
    href: "/settings/packeta",
    label: "Packeta",
  },
  {
    description: "Konfigurace PPL klienta a stitku.",
    href: "/settings/ppl",
    label: "PPL",
  },
  {
    description: "Napojeni CMS administrace.",
    href: "/settings/payload",
    label: "Payload",
  },
]

export function SettingsPage() {
  return (
    <section className="admin-page">
      <PageTitle eyebrow="Nastaveni" title="Nastaveni adminu" />
      <div className="admin-settings-grid">
        {settingsItems.map((item) => (
          <Link className="admin-settings-card" key={item.href} to={item.href}>
            <strong>{item.label}</strong>
            <span>{item.description}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}

export function QrPaymentsSettingsPage() {
  const queryClient = useQueryClient()
  const config = useQrPaymentConfig()
  const [iban, setIban] = useState("")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const mutation = useMutation({
    mutationFn: updateQrPaymentConfig,
    onError: (error) => {
      setFeedback({
        message:
          error instanceof Error
            ? error.message
            : "QR platby se nepodarilo ulozit.",
        tone: "error",
      })
    },
    onSuccess: async (response) => {
      setIban(response.config.iban ?? "")
      await queryClient.invalidateQueries({ queryKey: ["qr-payment-config"] })
      setFeedback({
        message: "QR platby byly ulozene.",
        tone: "success",
      })
    },
  })

  useEffect(() => {
    if (config.data?.config) {
      setIban(config.data.config.iban ?? "")
    }
  }, [config.data])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const normalizedIban = iban.trim()

    mutation.mutate({
      iban: normalizedIban ? normalizedIban : null,
    })
  }

  function renderConfigContent() {
    if (config.isLoading) {
      return (
        <div aria-busy="true" className="admin-table-state">
          Nacitam konfiguraci...
        </div>
      )
    }

    if (config.isError) {
      return (
        <div className="admin-table-state admin-table-state-error">
          Konfiguraci QR plateb se nepodarilo nacist.
        </div>
      )
    }

    return (
      <form className="admin-settings-form" onSubmit={handleSubmit}>
        <AdminTextField
          autoComplete="off"
          id="qr-payment-iban"
          label="IBAN"
          onValueChange={(value) => {
            setIban(value)
            setFeedback(null)
          }}
          placeholder="CZ3301000000000002970297"
          value={iban}
        />
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
        <div className="admin-form-actions">
          <AdminToolbarButton disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Ukladam..." : "Ulozit"}
          </AdminToolbarButton>
        </div>
      </form>
    )
  }

  return (
    <section className="admin-page">
      <PageTitle eyebrow="Nastaveni" title="QR platby" />
      <div className="admin-panel admin-form-panel">
        <div className="admin-panel-header">
          <div>
            <h2>Bankovni ucet</h2>
            <span>Aktualni prijemce pro QR platbu u objednavek.</span>
          </div>
        </div>
        {renderConfigContent()}
      </div>
    </section>
  )
}

function PageTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <header className="admin-page-header">
      <div>
        <span className="admin-eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
      </div>
    </header>
  )
}
