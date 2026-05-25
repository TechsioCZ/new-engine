import type { ReactNode } from "react"
import { cx } from "../utils/cx"
import { AdminFormInput } from "./admin-form-input"

type AdminTextFieldProps = {
  action?: ReactNode
  autoComplete?: string
  className?: string
  disabled?: boolean
  id: string
  label: ReactNode
  meta?: ReactNode
  onValueChange: (value: string) => void
  placeholder?: string
  type?: "email" | "password" | "text"
  value: string
  wide?: boolean
}

export function AdminTextField({
  action,
  autoComplete,
  className,
  disabled,
  id,
  label,
  meta,
  onValueChange,
  placeholder,
  type = "text",
  value,
  wide = false,
}: AdminTextFieldProps) {
  const rootClassName = cx(wide ? "col-span-full" : null, className)

  return (
    <AdminFormInput
      action={action}
      autoComplete={autoComplete}
      disabled={disabled}
      id={id}
      label={label}
      meta={meta}
      onChange={(event) => onValueChange(event.target.value)}
      placeholder={placeholder}
      rootClassName={rootClassName}
      type={type}
      value={value}
    />
  )
}
