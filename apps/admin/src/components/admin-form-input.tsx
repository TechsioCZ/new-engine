import { Input, type InputProps } from "@techsio/ui-kit/atoms/input"
import { Label } from "@techsio/ui-kit/atoms/label"
import type { ReactNode } from "react"
import { cx } from "../utils/cx"

type AdminFormInputProps = Omit<InputProps, "id"> & {
  action?: ReactNode
  id: string
  label: ReactNode
  meta?: ReactNode
  rootClassName?: string
}

export function AdminFormInput({
  action,
  className,
  disabled,
  id,
  label,
  meta,
  required,
  rootClassName,
  size = "md",
  ...props
}: AdminFormInputProps) {
  return (
    <div className={cx("flex flex-col gap-form-field-gap", rootClassName)}>
      <div className="flex items-center justify-between gap-200">
        <div className="inline-flex min-w-0 items-center gap-200">
          <Label
            disabled={disabled}
            htmlFor={id}
            required={required}
            size={size}
          >
            {label}
          </Label>
          {meta}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>

      <Input
        className={className}
        disabled={disabled}
        id={id}
        required={required}
        size={size}
        {...props}
      />
    </div>
  )
}
