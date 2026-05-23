import { Button, type ButtonProps } from "@techsio/ui-kit/atoms/button"

type AdminToolbarButtonProps = ButtonProps

export function AdminToolbarButton({
  className,
  size = "sm",
  theme = "outlined",
  type = "button",
  variant = "secondary",
  ...props
}: AdminToolbarButtonProps) {
  return (
    <Button
      className={["max-md:w-full", className].filter(Boolean).join(" ")}
      size={size}
      theme={theme}
      type={type}
      variant={variant}
      {...props}
    />
  )
}
