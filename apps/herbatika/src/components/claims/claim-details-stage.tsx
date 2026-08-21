"use client"

import { useTranslations } from "next-intl"
import {
  buildClaimInput,
  type ClaimResolution,
  type ClaimType,
  createClaim,
  type VerifiedOrder,
} from "@/lib/claims/claims-api"
import { runDetachedPromise } from "@/lib/storefront/detached-promise"
import { ClaimDetailsForm } from "./claim-details-form"
import type { SelectedClaimItem } from "./claim-order-items"

type ClaimDetailsStageProps = {
  accessToken: string
  busy: boolean
  defectDescription: string
  email: string
  manualItem: string
  onBack: () => void
  onDefectDescriptionChange: (value: string) => void
  onEmailChange: (value: string) => void
  onManualItemChange: (value: string) => void
  onPurchaseDetailsChange: (value: string) => void
  onReasonChange: (value: string) => void
  onResolutionChange: (value: ClaimResolution) => void
  onSelectedItemsChange: (items: SelectedClaimItem[]) => void
  onSuccess: (caseNumber: string) => void
  onTurnstileTokenChange: (value: string | null) => void
  order: VerifiedOrder | null
  orderNumber: string
  purchaseDetails: string
  reason: string
  requireCaptcha: () => boolean
  resolution: ClaimResolution
  run: (action: () => Promise<void>) => Promise<void>
  selectedItems: SelectedClaimItem[]
  setError: (message: string) => void
  turnstileReset: number
  turnstileToken: string | null
  type: ClaimType
}

export function ClaimDetailsStage(props: ClaimDetailsStageProps) {
  const t = useTranslations("claims")

  return (
    <ClaimDetailsForm
      {...props}
      onSubmit={(event) => {
        event.preventDefault()
        const items = props.order
          ? props.selectedItems.map((item) => ({
              order_item_id: item.id,
              quantity: item.selectedQuantity,
            }))
          : [{ title: props.manualItem.trim(), quantity: 1 }]
        const manualFieldsComplete = Boolean(
          props.email.trim() &&
            props.manualItem.trim() &&
            props.purchaseDetails.trim()
        )
        const hasValidItems = props.order
          ? items.length > 0
          : manualFieldsComplete
        if (!hasValidItems) {
          props.setError(t("details_incomplete"))
          return
        }
        if (
          props.type === "complaint" &&
          props.defectDescription.trim().length < 3
        ) {
          props.setError(t("defect_required"))
          return
        }
        if (!props.requireCaptcha()) {
          return
        }
        runDetachedPromise(
          props.run(async () => {
            const result = await createClaim(
              buildClaimInput({
                accessToken: props.accessToken,
                defectDescription: props.defectDescription,
                email: props.email,
                items,
                orderNumber: props.orderNumber,
                purchaseDetails: props.purchaseDetails,
                reason: props.reason,
                resolution: props.resolution,
                turnstileToken: props.turnstileToken,
                type: props.type,
              })
            )
            props.onSuccess(result.case_number)
          })
        )
      }}
    />
  )
}
