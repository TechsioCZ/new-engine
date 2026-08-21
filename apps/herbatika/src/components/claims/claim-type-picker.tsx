"use client"

import { RadioGroup } from "@techsio/ui-kit/molecules/radio-group"
import { useTranslations } from "next-intl"
import type { ClaimType } from "@/lib/claims/claims-api"

export function ClaimTypePicker({
  value,
  onChange,
}: {
  value: ClaimType
  onChange: (value: ClaimType) => void
}) {
  const t = useTranslations("claims")

  return (
    <RadioGroup
      onValueChange={(next) => onChange(next as ClaimType)}
      value={value}
    >
      <RadioGroup.Label>{t("type_question")}</RadioGroup.Label>
      <RadioGroup.ItemGroup>
        <RadioGroup.Item value="return">
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemControl />
          <RadioGroup.ItemContent>
            <RadioGroup.ItemText>{t("return_title")}</RadioGroup.ItemText>
            <RadioGroup.ItemDescription>
              {t("return_description")}
            </RadioGroup.ItemDescription>
          </RadioGroup.ItemContent>
        </RadioGroup.Item>
        <RadioGroup.Item value="complaint">
          <RadioGroup.ItemHiddenInput />
          <RadioGroup.ItemControl />
          <RadioGroup.ItemContent>
            <RadioGroup.ItemText>{t("complaint_title")}</RadioGroup.ItemText>
            <RadioGroup.ItemDescription>
              {t("complaint_description")}
            </RadioGroup.ItemDescription>
          </RadioGroup.ItemContent>
        </RadioGroup.Item>
      </RadioGroup.ItemGroup>
    </RadioGroup>
  )
}
