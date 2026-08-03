import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import type { ReactNode } from "react"

import { SupportingText } from "@/components/text/supporting-text"

export function PaymentReturnStatusCard({
  actions,
  children,
  status,
  title,
}: {
  actions?: ReactNode
  children: ReactNode
  status: "default" | "error" | "success" | "warning"
  title: string
}) {
  return (
    <section className="mx-auto flex max-w-checkout-status flex-col gap-300 rounded-sm border border-border-primary bg-surface p-400 sm:p-550">
      <h1 className="font-rubik font-semibold text-fg-primary text-xl">
        {title}
      </h1>
      <StatusText aria-live="polite" showIcon status={status}>
        {children}
      </StatusText>
      <SupportingText>
        Ak sa stav nezmení, objednávku môžete skontrolovať v účte alebo skúsiť
        dokončenie znova.
      </SupportingText>
      {actions ? <div className="flex flex-wrap gap-200">{actions}</div> : null}
    </section>
  )
}
