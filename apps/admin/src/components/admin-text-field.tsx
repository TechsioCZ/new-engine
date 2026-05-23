import { FormInput } from "@techsio/ui-kit/molecules/form-input"
import type { ReactNode } from "react"

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
}: AdminTextFieldProps) {
  const labelContent =
    meta || action ? (
      <span className="admin-field-label-row">
        <span>
          {label}
          {meta}
        </span>
        {action}
      </span>
    ) : (
      label
    )

  return (
    <div className={className}>
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
