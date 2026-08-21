"use client"

import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import { useState } from "react"
import {
  type ClaimResolution,
  type ClaimType,
  requestClaimAccess,
  type VerifiedOrder,
  verifyClaimAccess,
} from "@/lib/claims/claims-api"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { ClaimLookupForm, ClaimVerifyForm } from "./claim-access-forms"
import { ClaimDetailsStage } from "./claim-details-stage"
import type { SelectedClaimItem } from "./claim-order-items"
import { ClaimSuccess } from "./claim-success"
import { ClaimTypePicker } from "./claim-type-picker"
import { isTurnstileRequired } from "./turnstile-widget"
import { useClaimRequest } from "./use-claim-request"

type Stage = "lookup" | "verify" | "details" | "success"
const ACCESS_CODE_PATTERN = /^\d{6}$/

export function ClaimForm() {
  const t = useTranslations("claims")
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
      setError(t("captcha_required"))
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
        <ClaimLookupForm
          busy={busy}
          email={email}
          onEmailChange={setEmail}
          onManualEntry={() => {
            setOrder(null)
            setAccessToken("")
            setStage("details")
            setError("")
            setTurnstileReset((value) => value + 1)
          }}
          onOrderNumberChange={setOrderNumber}
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
          onTurnstileTokenChange={setTurnstileToken}
          orderNumber={orderNumber}
          turnstileReset={turnstileReset}
        />
      ) : null}

      {stage === "verify" ? (
        <ClaimVerifyForm
          busy={busy}
          code={code}
          email={email}
          onBack={() => setStage("lookup")}
          onCodeChange={setCode}
          onSubmit={(event) => {
            event.preventDefault()
            if (!ACCESS_CODE_PATTERN.test(code)) {
              setError(t("code_invalid"))
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
        />
      ) : null}

      {stage === "details" ? (
        <ClaimDetailsStage
          accessToken={accessToken}
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
          onSuccess={(nextCaseNumber) => {
            setCaseNumber(nextCaseNumber)
            setStage("success")
          }}
          onTurnstileTokenChange={setTurnstileToken}
          order={order}
          orderNumber={orderNumber}
          purchaseDetails={purchaseDetails}
          reason={reason}
          requireCaptcha={requireCaptcha}
          resolution={resolution}
          run={run}
          selectedItems={selectedItems}
          setError={setError}
          turnstileReset={turnstileReset}
          turnstileToken={turnstileToken}
          type={type}
        />
      ) : null}
    </div>
  )
}
