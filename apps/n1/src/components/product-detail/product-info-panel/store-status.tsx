import { Tooltip } from "@techsio/ui-kit/atoms/tooltip"

const StatusContent = ({ quantity }: { quantity: number }) => (
  <div className="text-xs">
    <h4 className="font-bold">Sklad N1shop - doba dodání 1-2 dny:</h4>
    <p className="font-semibold text-success">{quantity} ks</p>
  </div>
)

export const StoreStatus = ({ quantity }: { quantity: number }) => (
  <Tooltip
    className="relative bg-secondary text-fg-reverse [--arrow-background:var(--color-secondary)]"
    content={<StatusContent quantity={quantity} />}
    offset={{ mainAxis: 4, crossAxis: 4 }}
    placement="bottom-start"
  >
    <span className="cursor-help font-bold text-lg text-success underline decoration-dotted underline-offset-4">
      Skladem {quantity} ks
    </span>
  </Tooltip>
)
