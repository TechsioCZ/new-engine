import { clx } from "@medusajs/ui"
import { formatAmount } from "../../../../utils"
import { PlaceholderCell } from "./placeholder-cell"

type AmountCellProps = {
  currencyCode: string
  amount?: number | null
  originalAmount?: number | null
  align?: "left" | "right"
  className?: string
}

export const AmountCell = ({
  currencyCode,
  amount,
  originalAmount,
  align = "left",
  className,
}: AmountCellProps) => {
  if (typeof amount === "undefined" || amount === null) {
    return <PlaceholderCell />
  }

  const formatted = formatAmount(amount, currencyCode)
  const originalAmountPresent = typeof originalAmount === "number"
  const originalAmountDiffers = originalAmount !== amount
  const shouldShowAmountDiff = originalAmountPresent && originalAmountDiffers

  return (
    <div
      className={clx(
        "flex h-full w-full items-center overflow-hidden",
        {
          "flex-col": shouldShowAmountDiff,
          "justify-start text-left": align === "left",
          "justify-end text-right": align === "right",
        },
        className
      )}
    >
      {shouldShowAmountDiff ? (
        <>
          <span className="truncate text-xs line-through">
            {formatAmount(originalAmount!, currencyCode)}
          </span>
          <span className="txt-small truncate text-blue-400">{formatted}</span>
        </>
      ) : (
        <>
          <span className="truncate">{formatted}</span>
        </>
      )}
    </div>
  )
}
