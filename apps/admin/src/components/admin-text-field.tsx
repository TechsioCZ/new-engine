import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import type { ReactNode } from "react"
import { AdminFieldLabelRow } from "./admin-settings-form"

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
  const rootClassName = [wide ? "col-span-full" : null, className]
    .filter(Boolean)
    .join(" ")
  const labelContent =
    meta || action ? (
      <AdminFieldLabelRow action={action} label={label} meta={meta} />
    ) : (
      label
    )

  return (
    <div className={rootClassName || undefined}>
      <FormInput
        autoComplete={autoComplete}
        disabled={disabled}
        id={id}
        label={labelContent}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value}
      />
    </div>
  )
}
