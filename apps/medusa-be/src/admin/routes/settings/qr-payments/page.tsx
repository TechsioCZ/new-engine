import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { FormEvent } from "react"
import { useEffect, useState } from "react"
import { sdk } from "../../../lib/sdk"

type QrPaymentConfigResponse = {
  id: string
  environment: string
  iban: string | null
}

type QrPaymentConfigInput = {
  iban?: string | null
}

const QrPaymentsSettingsPage = () => {
  const queryClient = useQueryClient()
  const [iban, setIban] = useState("")

  const { data, error, isLoading } = useQuery({
    queryFn: () =>
      sdk.client.fetch<{ config: QrPaymentConfigResponse }>(
        "/admin/qr-payment-config"
      ),
    queryKey: ["qr-payment-config"],
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (payload: QrPaymentConfigInput) =>
      sdk.client.fetch("/admin/qr-payment-config", {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qr-payment-config"] })
      toast.success("QR payment configuration saved")
    },
    onError: (err) => {
      toast.error(`Failed to save configuration: ${err.message}`)
    },
  })

  const qrConfig = data?.config

  useEffect(() => {
    if (qrConfig) {
      setIban(qrConfig.iban ?? "")
    }
  }, [qrConfig])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    mutate({ iban: iban.trim() || null })
  }

  if (isLoading) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">QR platby</Heading>
        </div>
        <div className="px-6 py-4">
          <Text>Loading...</Text>
        </div>
      </Container>
    )
  }

  if (error) {
    return (
      <Container className="divide-y p-0">
        <div className="px-6 py-4">
          <Heading level="h1">QR platby</Heading>
        </div>
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">
            Error loading QR payment configuration.
          </Text>
        </div>
      </Container>
    )
  }

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">QR platby</Heading>
        <Text className="text-ui-fg-subtle">
          Environment: {qrConfig?.environment}
        </Text>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="px-6 py-4">
          <div className="flex max-w-xl flex-col gap-2">
            <Label htmlFor="qr-payment-iban">IBAN</Label>
            <Input
              id="qr-payment-iban"
              onChange={(event) => setIban(event.target.value)}
              placeholder="CZ3301000000000002970297"
              value={iban}
            />
            <Text className="text-sm text-ui-fg-subtle">
              Účet příjemce používaný pro QR kód nových objednávek.
            </Text>
          </div>
        </div>

        <div className="flex justify-end border-t px-6 py-4">
          <Button isLoading={isPending} type="submit">
            Save Changes
          </Button>
        </div>
      </form>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "QR platby",
})

export default QrPaymentsSettingsPage
