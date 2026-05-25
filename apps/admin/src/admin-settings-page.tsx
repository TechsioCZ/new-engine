import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type FormEvent, useEffect, useState } from "react"
import { updateQrPaymentConfig, useQrPaymentConfig } from "./admin-api"
import {
  AdminFeedback,
  type AdminFeedbackState,
} from "./components/admin-feedback"
import {
  AdminLinkCard,
  AdminLinkCardDescription,
  AdminLinkCardGrid,
  AdminLinkCardTitle,
} from "./components/admin-link-card"
import { AdminPage, AdminPageHeader } from "./components/admin-page-header"
import { AdminPanelHeader } from "./components/admin-panel-header"
import {
  AdminFormActions,
  AdminSettingsForm,
  AdminSettingsPanel,
} from "./components/admin-settings-form"
import { AdminState } from "./components/admin-state"
import { AdminTextField } from "./components/admin-text-field"
import { AdminToolbarButton } from "./components/admin-toolbar-button"

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
    <AdminPage>
      <AdminPageHeader eyebrow="Nastaveni" title="Nastaveni adminu" />
      <AdminLinkCardGrid>
        {settingsItems.map((item) => (
          <AdminLinkCard key={item.href} to={item.href}>
            <AdminLinkCardTitle>{item.label}</AdminLinkCardTitle>
            <AdminLinkCardDescription>
              {item.description}
            </AdminLinkCardDescription>
          </AdminLinkCard>
        ))}
      </AdminLinkCardGrid>
    </AdminPage>
  )
}

export function QrPaymentsSettingsPage() {
  const queryClient = useQueryClient()
  const config = useQrPaymentConfig()
  const [iban, setIban] = useState("")
  const [feedback, setFeedback] = useState<AdminFeedbackState>(null)
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
      return <AdminState isBusy>Nacitam konfiguraci...</AdminState>
    }

    if (config.isError) {
      return (
        <AdminState tone="error">
          Konfiguraci QR plateb se nepodarilo nacist.
        </AdminState>
      )
    }

    return (
      <AdminSettingsForm onSubmit={handleSubmit}>
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
          <AdminFeedback tone={feedback.tone}>{feedback.message}</AdminFeedback>
        )}
        <AdminFormActions>
          <AdminToolbarButton disabled={mutation.isPending} type="submit">
            {mutation.isPending ? "Ukladam..." : "Ulozit"}
          </AdminToolbarButton>
        </AdminFormActions>
      </AdminSettingsForm>
    )
  }

  return (
    <AdminPage>
      <AdminPageHeader eyebrow="Nastaveni" title="QR platby" />
      <AdminSettingsPanel width="form">
        <AdminPanelHeader
          subtitle="Aktualni prijemce pro QR platbu u objednavek."
          title="Bankovni ucet"
        />
        {renderConfigContent()}
      </AdminSettingsPanel>
    </AdminPage>
  )
}
