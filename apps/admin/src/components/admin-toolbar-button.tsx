import { Button, type ButtonProps } from "@techsio/ui-kit/atoms/button"
import { cx } from "../utils/cx"

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
      className={cx("max-md:w-full", className)}
      size={size}
      theme={theme}
      type={type}
      variant={variant}
      {...props}
    />
  )
}
