import { StatusText } from "@techsio/ui-kit/atoms/status-text"
import type { StatusTextProps } from "@techsio/ui-kit/atoms/status-text"
import { useTranslations } from "next-intl"
import type { ReactElement, ReactNode } from "react"

import { SupportingText } from "@/components/text/supporting-text"

interface PaymentReturnStatusCardProps {
  actions?: ReactElement
  children: ReactNode
  status: StatusTextProps["status"]
  title: string
}

export const PaymentReturnStatusCard = ({
  actions,
  children,
  status,
  title,
}: PaymentReturnStatusCardProps) => {
  const tCheckout = useTranslations("checkout")

  return (
    <section className="mx-auto flex max-w-checkout-status flex-col gap-300 rounded-sm border border-border-primary bg-surface p-400 sm:p-550">
      <h1 className="font-rubik font-semibold text-fg-primary text-xl">
        {title}
      </h1>
      <StatusText aria-live="polite" showIcon status={status}>
        {children}
      </StatusText>
      <SupportingText>{tCheckout("payment_return_help")}</SupportingText>
      {actions === undefined ? null : (
        <div className="flex flex-wrap gap-200">{actions}</div>
      )}
    </section>
  )
}
