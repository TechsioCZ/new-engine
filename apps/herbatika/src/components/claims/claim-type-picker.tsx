"use client"

import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group"
import type { ClaimType } from "@/lib/claims/claims-api"

export function ClaimTypePicker({
  value,
  onChange,
}: {
  value: ClaimType
  onChange: (value: ClaimType) => void
}) {
  return (
    <RadioGroup
      onValueChange={(next) => onChange(next as ClaimType)}
      value={value}
    >
      <RadioGroup.Label>Čo potrebujete vybaviť?</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        <RadioGroup.Item value="return">
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemControl />
          <RadioGroup.ItemContent>
            <RadioGroup.ItemText>Vrátiť tovar</RadioGroup.ItemText>
            <RadioGroup.ItemDescription>
              Odstúpenie od zmluvy bez uvedenia dôvodu.
            </RadioGroup.ItemDescription>
          </RadioGroup.ItemContent>
        </RadioGroup.Item>
        <RadioGroup.Item value="complaint">
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemControl />
          <RadioGroup.ItemContent>
            <RadioGroup.ItemText>Reklamovať tovar</RadioGroup.ItemText>
            <RadioGroup.ItemDescription>
              Riešenie vady produktu.
            </RadioGroup.ItemDescription>
          </RadioGroup.ItemContent>
        </RadioGroup.Item>
      </RadioGroup.ItemGroup>
    </RadioGroup>
  )
}
