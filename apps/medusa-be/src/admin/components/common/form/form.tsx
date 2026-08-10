import { InformationCircleSolid } from "@medusajs/icons"
import {
  clx,
  Hint as HintComponent,
  Label as LabelComponent,
  Text,
  Tooltip,
} from "@medusajs/ui"
import type { Root as LabelRoot } from "@radix-ui/react-label"
import { Slot } from "@radix-ui/react-slot"
import { createContext, useContext, useId } from "react"
import type {
  ComponentPropsWithoutRef,
  ComponentRef,
  HTMLAttributes,
  ReactNode,
  Ref,
} from "react"
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
} from "react-hook-form"
import type { ControllerProps, FieldPath, FieldValues } from "react-hook-form"

const Provider = FormProvider

const EMPTY_ERROR_MESSAGES = new Set<ReactNode>([
  null,
  undefined,
  false,
  "",
  0,
  "undefined",
])

const FormFieldContext = createContext<string | null>(null)

const Field = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => (
  <FormFieldContext.Provider value={props.name}>
    <Controller {...props} />
  </FormFieldContext.Provider>
)

const FormItemContext = createContext<string | null>(null)

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext)
  const itemContext = useContext(FormItemContext)
  const { getFieldState } = useFormContext()
  const fieldName = fieldContext ?? ""
  const formState = useFormState({ name: fieldName })
  const fieldState = getFieldState(fieldName, formState)

  if (fieldContext === null) {
    throw new Error("useFormField should be used within a FormField")
  }
  if (itemContext === null) {
    throw new Error("useFormField should be used within a FormItem")
  }

  const id = itemContext

  return {
    formDescriptionId: `${id}-form-item-description`,
    formErrorMessageId: `${id}-form-item-message`,
    formItemId: `${id}-form-item`,
    formLabelId: `${id}-form-item-label`,
    id,
    name: fieldContext,
    ...fieldState,
  }
}

type ItemProps = HTMLAttributes<HTMLDivElement> & {
  ref?: Ref<HTMLDivElement>
}

const Item = ({ className, ref, ...props }: ItemProps) => {
  const id = useId()

  return (
    <FormItemContext.Provider value={id}>
      <div
        className={clx("flex flex-col space-y-2", className)}
        ref={ref}
        {...props}
      />
    </FormItemContext.Provider>
  )
}
Item.displayName = "Form.Item"

type LabelProps = ComponentPropsWithoutRef<typeof LabelRoot> & {
  icon?: ReactNode
  optional?: boolean
  ref?: Ref<ComponentRef<typeof LabelRoot>>
  tooltip?: ReactNode
}

const Label = ({
  className,
  optional = false,
  tooltip,
  icon,
  ref,
  ...props
}: LabelProps) => {
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
      {Boolean(tooltip) && (
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
}
Label.displayName = "Form.Label"

type ControlProps = ComponentPropsWithoutRef<typeof Slot> & {
  ref?: Ref<ComponentRef<typeof Slot>>
}

const Control = ({ ref, ...props }: ControlProps) => {
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
        error === undefined
          ? formDescriptionId
          : `${formDescriptionId} ${formErrorMessageId}`
      }
      aria-invalid={error !== undefined}
      aria-labelledby={formLabelId}
      id={formItemId}
      ref={ref}
      {...props}
    />
  )
}
Control.displayName = "Form.Control"

type HintProps = HTMLAttributes<HTMLParagraphElement> & {
  ref?: Ref<HTMLParagraphElement>
}

const Hint = ({ className, ref, ...props }: HintProps) => {
  const { formDescriptionId } = useFormField()

  return (
    <HintComponent
      className={className}
      id={formDescriptionId}
      ref={ref}
      {...props}
    />
  )
}
Hint.displayName = "Form.Hint"

type ErrorMessageProps = HTMLAttributes<HTMLParagraphElement> & {
  ref?: Ref<HTMLParagraphElement>
}

const ErrorMessage = ({
  className,
  children,
  ref,
  ...props
}: ErrorMessageProps) => {
  const { error, formErrorMessageId } = useFormField()
  const msg = error === undefined ? children : String(error.message)

  if (EMPTY_ERROR_MESSAGES.has(msg)) {
    return null
  }

  return (
    <HintComponent
      className={className}
      id={formErrorMessageId}
      ref={ref}
      variant={error === undefined ? "info" : "error"}
      {...props}
    >
      {msg}
    </HintComponent>
  )
}
ErrorMessage.displayName = "Form.ErrorMessage"

const Form = Object.assign(Provider, {
  Control,
  ErrorMessage,
  Field,
  Hint,
  Item,
  Label,
})

export { Form }
