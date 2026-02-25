import { InformationCircleSolid } from "@medusajs/icons"
import {
  clx,
  Hint as HintComponent,
  Label as LabelComponent,
  Text,
  Tooltip,
} from "@medusajs/ui"
import type * as LabelPrimitives from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import type React from "react"
import {
  createContext,
  forwardRef,
  type ReactNode,
  useContext,
  useId,
} from "react"
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  useFormState,
} from "react-hook-form"

const Provider = FormProvider

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName
}

const FormFieldContext = createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
)

const Field = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={{ name: props.name }}>
    <Controller {...props} />
  </FormFieldContext.Provider>
)

type FormItemContextValue = {
  id: string
}

const FormItemContext = createContext<FormItemContextValue>(
  {} as FormItemContextValue
)

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState } = useFormContext()

  const formState = useFormState({ name: fieldContext.name })
  const fieldState = getFieldState(fieldContext.name, formState)

  if (!fieldContext) {
    throw new Error("useFormField should be used within a FormField")
  }

  const { id } = itemContext

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formLabelId: `${id}-form-item-label`,
    formDescriptionId: `${id}-form-item-description`,
    formErrorMessageId: `${id}-form-item-message`,
    ...fieldState,
  }
}

const Item = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = useId()

    return (
      <FormItemContext.Provider value={{ id }}>
        <div
          className={clx("flex flex-col space-y-2", className)}
          ref={ref}
          {...props}
        />
      </FormItemContext.Provider>
    )
  }
)
Item.displayName = "Form.Item"

const Label = forwardRef<
  React.ElementRef<typeof LabelPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitives.Root> & {
    optional?: boolean
    tooltip?: ReactNode
    icon?: ReactNode
  }
>(({ className, optional = false, tooltip, icon, ...props }, ref) => {
  const { formLabelId, formItemId } = useFormField()

  return (
    <div className="flex items-center gap-x-1">
      <LabelComponent
        className={clx(className)}
        htmlFor={formItemId}
        id={formLabelId}
        ref={ref}
        size="small"
        weight="plus"
        {...props}
      />
      {tooltip && (
        <Tooltip content={tooltip}>
          <InformationCircleSolid className="text-ui-fg-muted" />
        </Tooltip>
      )}
      {icon}
      {optional && (
        <Text className="text-ui-fg-muted" leading="compact" size="small">
          Optional
        </Text>
      )}
    </div>
  )
})
Label.displayName = "Form.Label"

const Control = forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const {
    error,
    formItemId,
    formDescriptionId,
    formErrorMessageId,
    formLabelId,
  } = useFormField()

  return (
    <Slot
      aria-describedby={
        error
          ? `${formDescriptionId} ${formErrorMessageId}`
          : `${formDescriptionId}`
      }
      aria-invalid={!!error}
      aria-labelledby={formLabelId}
      id={formItemId}
      ref={ref}
      {...props}
    />
  )
})
Control.displayName = "Form.Control"

const Hint = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField()

  return (
    <HintComponent
      className={className}
      id={formDescriptionId}
      ref={ref}
      {...props}
    />
  )
})
Hint.displayName = "Form.Hint"

const ErrorMessage = forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formErrorMessageId } = useFormField()
  const msg = error ? String(error?.message) : children

  if (!msg || msg === "undefined") {
    return null
  }

  return (
    <HintComponent
      className={className}
      id={formErrorMessageId}
      ref={ref}
      variant={error ? "error" : "info"}
      {...props}
    >
      {msg}
    </HintComponent>
  )
})
ErrorMessage.displayName = "Form.ErrorMessage"

const Form = Object.assign(Provider, {
  Item,
  Label,
  Control,
  Hint,
  ErrorMessage,
  Field,
})

export { Form }
