import { Button, Prompt, RadioGroup } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import type { OrderDashboardPdfExportMode } from "./types"

type OrderPdfExportPromptProps = {
  isPending: boolean
  onConfirm: (mode: OrderDashboardPdfExportMode) => void
  onOpenChange: (open: boolean) => void
  open: boolean
  selectedCount: number
}

export function OrderPdfExportPrompt({
  isPending,
  onConfirm,
  onOpenChange,
  open,
  selectedCount,
}: OrderPdfExportPromptProps) {
  const { t } = useTranslation("orderDashboard")
  const [mode, setMode] = useState<OrderDashboardPdfExportMode>("combined")

  useEffect(() => {
    if (!open) {
      setMode("combined")
    }
  }, [open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (isPending && !nextOpen) {
      return
    }

    onOpenChange(nextOpen)
  }

  return (
    <Prompt onOpenChange={handleOpenChange} open={open} variant="confirmation">
      <Prompt.Content>
        <Prompt.Header>
          <Prompt.Title>{t("pdfExportPrompt.title")}</Prompt.Title>
          <Prompt.Description>
            {t("pdfExportPrompt.description", { count: selectedCount })}
          </Prompt.Description>
        </Prompt.Header>
        <div className="px-6 py-4">
          <RadioGroup
            disabled={isPending}
            onValueChange={(value) =>
              setMode(value as OrderDashboardPdfExportMode)
            }
            value={mode}
          >
            <RadioGroup.ChoiceBox
              description={t("pdfExportPrompt.combinedDescription")}
              label={t("pdfExportPrompt.combinedLabel")}
              value="combined"
            />
            <RadioGroup.ChoiceBox
              description={t("pdfExportPrompt.separateDescription")}
              label={t("pdfExportPrompt.separateLabel")}
              value="separate"
            />
          </RadioGroup>
        </div>
        <Prompt.Footer>
          <Button
            disabled={isPending}
            onClick={() => handleOpenChange(false)}
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.cancel")}
          </Button>
          <Button
            isLoading={isPending}
            onClick={() => onConfirm(mode)}
            size="small"
            type="button"
          >
            {t("pdfExportPrompt.export")}
          </Button>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  )
}
