interface ProductPriceProps {
  priceWithTax: string
  priceWithoutTax?: string | undefined
  size?: "sm" | "md" | "lg"
  className?: string
}

export const ProductPrice = ({
  priceWithTax,
  priceWithoutTax,
  size = "md",
  className = "",
}: ProductPriceProps) => {
  const sizeClasses = {
    lg: "text-xl",
    md: "text-lg",
    sm: "text-xs",
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <span className={`font-bold ${sizeClasses[size]}`}>{priceWithTax}</span>
      {priceWithoutTax && (
        <span className="text-2xs text-fg-secondary">
          {priceWithoutTax} bez DPH
        </span>
      )}
    </div>
  )
}
