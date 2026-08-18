import { StatusText } from "@techsio/ui-kit/atoms/status-text"

export function ClaimSuccess({ caseNumber }: { caseNumber: string }) {
  return (
    <div className="flex flex-col gap-300">
      <StatusText showIcon status="success">
        Prípad {caseNumber} bol úspešne odoslaný.
      </StatusText>
      <p className="text-fg-secondary">
        Potvrdenie a ďalšie pokyny vám pošleme e-mailom.
      </p>
    </div>
  )
}
