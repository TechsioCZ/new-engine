"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { useState } from "react"
import {
  buildClaimInput,
  type ClaimResolution,
  type ClaimType,
  createClaim,
  requestClaimAccess,
  type VerifiedOrder,
  verifyClaimAccess,
} from "@/lib/claims/claims-api"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { ClaimDetailsForm } from "./claim-details-form"
import type { SelectedClaimItem } from "./claim-order-items"
import { ClaimSuccess } from "./claim-success"
import { ClaimTypePicker } from "./claim-type-picker"
import { isTurnstileRequired, TurnstileWidget } from "./turnstile-widget"
import { useClaimRequest } from "./use-claim-request"

type Stage = "lookup" | "verify" | "details" | "success"
const ACCESS_CODE_PATTERN = /^\d{6}$/
const NON_DIGIT_PATTERN = /\D/g

export function ClaimForm() {
  const [stage, setStage] = useState<Stage>("lookup")
  const [type, setType] = useState<ClaimType>("return")
  const [email, setEmail] = useState("")
  const [orderNumber, setOrderNumber] = useState("")
  const [challengeId, setChallengeId] = useState("")
  const [code, setCode] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [order, setOrder] = useState<VerifiedOrder | null>(null)
  const [selectedItems, setSelectedItems] = useState<SelectedClaimItem[]>([])
  const [manualItem, setManualItem] = useState("")
  const [purchaseDetails, setPurchaseDetails] = useState("")
  const [reason, setReason] = useState("")
  const [defectDescription, setDefectDescription] = useState("")
  const [resolution, setResolution] = useState<ClaimResolution>("replacement")
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [turnstileReset, setTurnstileReset] = useState(0)
  const [caseNumber, setCaseNumber] = useState("")
  const { busy, error, run, setError } = useClaimRequest()

  const requireCaptcha = () => {
    if (isTurnstileRequired && !turnstileToken) {
      setError("Dokončite, prosím, overenie proti robotom.")
      return false
    }
    return true
  }

  if (stage === "success") {
    return <ClaimSuccess caseNumber={caseNumber} />
  }

  return (
    <div className="flex flex-col gap-500">
      <ClaimTypePicker onChange={setType} value={type} />
      {error ? (
        <StatusText align="start" showIcon status="error">
          {error}
        </StatusText>
      ) : null}

      {stage === "lookup" ? (
        <form
          className="flex flex-col gap-300"
          onSubmit={(event) => {
            event.preventDefault()
            if (!(email.trim() && orderNumber.trim() && requireCaptcha())) {
              return
            }
            runDetachedPromise(
              run(async () => {
                const result = await requestClaimAccess({
                  email: email.trim(),
                  order_number: orderNumber.trim(),
                  ...(turnstileToken
                    ? { turnstile_token: turnstileToken }
                    : {}),
                })
                setChallengeId(result.challenge_id)
                setStage("verify")
              })
            )
          }}
        >
          <FormInput
            autoComplete="email"
            id="claim-email"
            label="E-mail z objednávky"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
          <FormInput
            id="claim-order-number"
            label="Číslo objednávky"
            onChange={(event) => setOrderNumber(event.target.value)}
            required
            value={orderNumber}
          />
          <TurnstileWidget
            key={turnstileReset}
            onTokenChange={setTurnstileToken}
          />
          <Button isLoading={busy} type="submit">
            Poslať overovací kód
          </Button>
          <Button
            onClick={() => {
              setOrder(null)
              setAccessToken("")
              setStage("details")
              setError("")
              setTurnstileReset((value) => value + 1)
            }}
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Nemám číslo objednávky alebo iný e-mail
          </Button>
        </form>
      ) : null}

      {stage === "verify" ? (
        <form
          className="flex flex-col gap-300"
          onSubmit={(event) => {
            event.preventDefault()
            if (!ACCESS_CODE_PATTERN.test(code)) {
              setError("Zadajte šesťmiestny kód z e-mailu.")
              return
            }
            runDetachedPromise(
              run(async () => {
                const result = await verifyClaimAccess({
                  challenge_id: challengeId,
                  code,
                })
                setAccessToken(result.access_token)
                setOrder(result.order)
                setOrderNumber(result.order.display_id)
                setStage("details")
                setTurnstileReset((value) => value + 1)
              })
            )
          }}
        >
          <p className="text-fg-secondary">
            Ak sa údaje zhodujú, poslali sme šesťmiestny kód na {email}.
          </p>
          <FormInput
            autoComplete="one-time-code"
            id="claim-code"
            inputMode="numeric"
            label="Overovací kód"
            maxLength={6}
            onChange={(event) =>
              setCode(event.target.value.replace(NON_DIGIT_PATTERN, ""))
            }
            required
            value={code}
          />
          <Button isLoading={busy} type="submit">
            Overiť objednávku
          </Button>
          <Button
            onClick={() => setStage("lookup")}
            theme="outlined"
            type="button"
            variant="secondary"
          >
            Späť
          </Button>
        </form>
      ) : null}

      {stage === "details" ? (
        <ClaimDetailsForm
          busy={busy}
          defectDescription={defectDescription}
          email={email}
          manualItem={manualItem}
          onBack={() => setStage(order ? "verify" : "lookup")}
          onDefectDescriptionChange={setDefectDescription}
          onEmailChange={setEmail}
          onManualItemChange={setManualItem}
          onPurchaseDetailsChange={setPurchaseDetails}
          onReasonChange={setReason}
          onResolutionChange={setResolution}
          onSelectedItemsChange={setSelectedItems}
          // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: validation covers verified and manual claim modes in one submit boundary
          onSubmit={(event) => {
            event.preventDefault()
            const items = order
              ? selectedItems.map((item) => ({
                  order_item_id: item.id,
                  quantity: item.selectedQuantity,
                }))
              : [{ title: manualItem.trim(), quantity: 1 }]
            const manualFieldsComplete = Boolean(
              email.trim() && manualItem.trim() && purchaseDetails.trim()
            )
            const hasValidItems = order
              ? items.length > 0
              : manualFieldsComplete
            if (!hasValidItems) {
              setError("Vyplňte povinné údaje a vyberte aspoň jeden produkt.")
              return
            }
            if (type === "complaint" && defectDescription.trim().length < 3) {
              setError("Popíšte, prosím, vadu produktu.")
              return
            }
            if (!requireCaptcha()) {
              return
            }
            runDetachedPromise(
              run(async () => {
                const result = await createClaim(
                  buildClaimInput({
                    accessToken,
                    defectDescription,
                    email,
                    items,
                    orderNumber,
                    purchaseDetails,
                    reason,
                    resolution,
                    turnstileToken,
                    type,
                  })
                )
                setCaseNumber(result.case_number)
                setStage("success")
              })
            )
          }}
          onTurnstileTokenChange={setTurnstileToken}
          order={order}
          purchaseDetails={purchaseDetails}
          reason={reason}
          resolution={resolution}
          selectedItems={selectedItems}
          turnstileReset={turnstileReset}
          type={type}
        />
      ) : null}
    </div>
  )
}
