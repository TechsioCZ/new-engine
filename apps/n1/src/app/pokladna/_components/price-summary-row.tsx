interface PriceSummaryRowProps {
  label: string
  value: string | number
  variant?: "default" | "success" | "bold"
}

export function PriceSummaryRow({
  label,
  value,
  variant = "default",
}: PriceSummaryRowProps) {
  const valueClasses = {
    bold: "font-bold text-fg-primary text-lg",
    default: "text-fg-primary",
    success: "text-success",
  }

  const labelClasses = {
    bold: "font-bold text-fg-primary text-lg",
    default: "text-fg-secondary",
    success: "text-fg-secondary",
  }

  return (
    <div className="flex justify-between text-sm">
      <span className={labelClasses[variant]}>{label}</span>
      <span className={valueClasses[variant]}>{value}</span>
    </div>
  )
}
