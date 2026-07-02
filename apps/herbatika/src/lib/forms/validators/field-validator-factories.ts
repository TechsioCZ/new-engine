type FieldValueValidator<TValue> = (value: TValue) => string | undefined
type FieldValidationPredicate<TFormValues> = (values: TFormValues) => boolean
type ScopedFieldValueValidator<TValue, TFormValues> = (context: {
  value: TValue
  values: TFormValues
}) => string | undefined
type ValueValidationContext<TValue> = {
  value: TValue
}
type ScopedValueValidationContext<TValue, TFormValues> = {
  fieldApi: {
    form: {
      state: {
        values: TFormValues
      }
    }
  }
  value: TValue
}
type ScopedFieldValidatorOptions<TFormValues, TListenTo extends string> = {
  onBlurListenTo?: TListenTo[]
  onChangeListenTo?: TListenTo[]
  shouldValidate?: FieldValidationPredicate<TFormValues>
}

export const createChangeBlurFieldValidators = <TValue>(
  validator: FieldValueValidator<TValue>
) => ({
  onBlur: ({ value }: ValueValidationContext<TValue>) => validator(value),
  onChange: ({ value }: ValueValidationContext<TValue>) => validator(value),
})

export const createChangeBlurContextualFieldValidators = <
  TContext extends { value: unknown },
>(
  validator: (context: TContext) => string | undefined
) => ({
  onBlur: (context: TContext) => validator(context),
  onChange: (context: TContext) => validator(context),
})

export const createChangeBlurSubmitScopedFieldValidators = <
  TValue,
  TFormValues,
>(
  validator: FieldValueValidator<TValue>,
  shouldValidate?: FieldValidationPredicate<TFormValues>
) => {
  const validateWhenActive = shouldValidate ?? ((_values: TFormValues) => true)

  return {
    onBlur: ({
      fieldApi,
      value,
    }: ScopedValueValidationContext<TValue, TFormValues>) =>
      validateWhenActive(fieldApi.form.state.values)
        ? validator(value)
        : undefined,
    onChange: ({
      fieldApi,
      value,
    }: ScopedValueValidationContext<TValue, TFormValues>) =>
      validateWhenActive(fieldApi.form.state.values)
        ? validator(value)
        : undefined,
    onSubmit: ({
      fieldApi,
      value,
    }: ScopedValueValidationContext<TValue, TFormValues>) =>
      validateWhenActive(fieldApi.form.state.values)
        ? validator(value)
        : undefined,
  }
}

export const createChangeBlurSubmitContextualFieldValidators = <
  TValue,
  TFormValues,
  TListenTo extends string = string,
>(
  validator: ScopedFieldValueValidator<TValue, TFormValues>,
  options: ScopedFieldValidatorOptions<TFormValues, TListenTo> = {}
) => {
  const validateWhenActive =
    options.shouldValidate ?? ((_values: TFormValues) => true)
  const validate = ({
    fieldApi,
    value,
  }: ScopedValueValidationContext<TValue, TFormValues>) => {
    const values = fieldApi.form.state.values

    return validateWhenActive(values) ? validator({ value, values }) : undefined
  }

  return {
    ...(options.onBlurListenTo
      ? { onBlurListenTo: options.onBlurListenTo }
      : {}),
    ...(options.onChangeListenTo
      ? { onChangeListenTo: options.onChangeListenTo }
      : {}),
    onBlur: validate,
    onChange: validate,
    onSubmit: validate,
  }
}
