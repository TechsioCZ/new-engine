interface TooltipContentProps {
  title: string
  variant: string
  quantity: number
}

export const TooltipContent = ({
  title,
  variant,
  quantity,
}: TooltipContentProps) => (
  <div className="grid">
    <h4 className="font-bold">{title}</h4>
    <p>{variant}</p>
    <p className="place-self-end-safe font-semibold text-success">
      Skladem {quantity} ks
    </p>
  </div>
)
