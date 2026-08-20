"use client"

import { Button } from "@techsio/ui-kit/atoms/button"
import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import { FormTextarea } from "@techsio/ui-kit/molecules/form-textarea"
import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group"
import type { FormEvent } from "react"
import type {
  ClaimResolution,
  ClaimType,
  VerifiedOrder,
} from "@/lib/claims/claims-api"
import { ClaimOrderItems, type SelectedClaimItem } from "./claim-order-items"
import { TurnstileWidget } from "./turnstile-widget"

const resolutionOptions: Array<{ label: string; value: ClaimResolution }> = [
  { label: "Oprava", value: "repair" },
  { label: "Výmena", value: "replacement" },
  { label: "Zľava", value: "discount" },
  { label: "Vrátenie peňazí", value: "refund" },
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
  return (
    <form className="flex flex-col gap-400" onSubmit={props.onSubmit}>
      {props.order ? (
        <>
          <p className="font-bold text-fg-primary">
            Objednávka č. {props.order.display_id}
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
            label="Kontaktný e-mail"
            onChange={(event) => props.onEmailChange(event.target.value)}
            required
            type="email"
            value={props.email}
          />
          <FormInput
            id="manual-claim-item"
            label="Názov produktu"
            onChange={(event) => props.onManualItemChange(event.target.value)}
            required
            value={props.manualItem}
          />
          <FormTextarea
            id="manual-purchase-details"
            label="Údaje o nákupe"
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
            ? "Dôvod vrátenia (nepovinné)"
            : "Doplňujúce informácie (nepovinné)"
        }
        onChange={(event) => props.onReasonChange(event.target.value)}
        value={props.reason}
      />
      {props.type === "complaint" ? (
        <>
          <FormTextarea
            id="claim-defect"
            label="Popis vady"
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
            <RadioGroup.Label>Požadované riešenie</RadioGroup.Label>
            <RadioGroup.ItemGroup>
              {resolutionOptions.map((option) => (
                <RadioGroup.Item key={option.value} value={option.value}>
                  <RadioGroup.ItemHiddenInput />
                  <RadioGroup.ItemControl />
                  <RadioGroup.ItemContent>
                    <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
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
        Odoslať {props.type === "return" ? "vrátenie" : "reklamáciu"}
      </Button>
      <Button
        onClick={props.onBack}
        theme="outlined"
        type="button"
        variant="secondary"
      >
        Späť
      </Button>
    </form>
  )
}
