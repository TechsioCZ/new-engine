"use client"

import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"

export function ClaimSuccess({ caseNumber }: { caseNumber: string }) {
  const t = useTranslations("claims")

  return (
    <div className="flex flex-col gap-300">
      <StatusText showIcon status="success">
        {t("success_case", { caseNumber })}
      </StatusText>
      <p className="text-fg-secondary">{t("success_followup")}</p>
    </div>
  )
}
