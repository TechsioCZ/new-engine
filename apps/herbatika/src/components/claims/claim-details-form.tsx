"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea"
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group"
import { useTranslations } from "next-intl"
import type { FormEvent } from "react"
import type {
  ClaimResolution,
  ClaimType,
  VerifiedOrder,
} from "@/lib/claims/claims-api"
import { ClaimOrderItems, type SelectedClaimItem } from "./claim-order-items"
import { TurnstileWidget } from "./turnstile-widget"

const RESOLUTIONS: ClaimResolution[] = [
  "repair",
  "replacement",
  "discount",
  "refund",
]

type ClaimDetailsFormProps = {
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
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTurnstileTokenChange: (value: string | null) => void
  order: VerifiedOrder | null
  purchaseDetails: string
  reason: string
  resolution: ClaimResolution
  selectedItems: SelectedClaimItem[]
  turnstileReset: number
  type: ClaimType
}

export function ClaimDetailsForm(props: ClaimDetailsFormProps) {
  const t = useTranslations("claims")

  return (
    <form className="flex flex-col gap-400" onSubmit={props.onSubmit}>
      {props.order ? (
        <>
          <p className="font-bold text-fg-primary">
            {t("order_heading", { orderNumber: props.order.display_id })}
          </p>
          <ClaimOrderItems
            items={props.order.items}
            onChange={props.onSelectedItemsChange}
            selectedItems={props.selectedItems}
          />
        </>
      ) : (
        <>
          <FormInput
            autoComplete="email"
            id="manual-claim-email"
            label={t("contact_email_label")}
            onChange={(event) => props.onEmailChange(event.target.value)}
            required
            type="email"
            value={props.email}
          />
          <FormInput
            id="manual-claim-item"
            label={t("product_name_label")}
            onChange={(event) => props.onManualItemChange(event.target.value)}
            required
            value={props.manualItem}
          />
          <FormTextarea
            id="manual-purchase-details"
            label={t("purchase_details_label")}
            onChange={(event) =>
              props.onPurchaseDetailsChange(event.target.value)
            }
            required
            value={props.purchaseDetails}
          />
        </>
      )}
      <FormTextarea
        id="claim-reason"
        label={
          props.type === "return"
            ? t("return_reason_optional")
            : t("complaint_info_optional")
        }
        onChange={(event) => props.onReasonChange(event.target.value)}
        value={props.reason}
      />
      {props.type === "complaint" ? (
        <>
          <FormTextarea
            id="claim-defect"
            label={t("defect_description_label")}
            onChange={(event) =>
              props.onDefectDescriptionChange(event.target.value)
            }
            required
            value={props.defectDescription}
          />
          <RadioGroup
            onValueChange={(value) =>
              props.onResolutionChange(value as ClaimResolution)
            }
            value={props.resolution}
          >
            <RadioGroup.Label>{t("requested_resolution")}</RadioGroup.Label>
            <RadioGroup.ItemGroup>
              {RESOLUTIONS.map((resolutionOption) => (
                <RadioGroup.Item
                  key={resolutionOption}
                  value={resolutionOption}
                >
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemControl />
                  <RadioGroup.ItemContent>
                    <RadioGroup.ItemText>
                      {t(`resolution_${resolutionOption}`)}
                    </RadioGroup.ItemText>
                  </RadioGroup.ItemContent>
                </RadioGroup.Item>
              ))}
            </RadioGroup.ItemGroup>
          </RadioGroup>
        </>
      ) : null}
      <TurnstileWidget
        key={props.turnstileReset}
        onTokenChange={props.onTurnstileTokenChange}
      />
      <Button isLoading={props.busy} type="submit">
        {t(props.type === "return" ? "submit_return" : "submit_complaint")}
      </Button>
      <Button
        onClick={props.onBack}
        theme="outlined"
        type="button"
        variant="secondary"
      >
        {t("back")}
      </Button>
    </form>
  )
}
