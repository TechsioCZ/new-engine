import { Trash } from "@medusajs/icons"
import {
  Button,
  Checkbox,
  Drawer,
  FocusModal,
  Input,
  Label,
  Select,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  type Brand,
  type BrandAttribute,
  type BrandAttributeType,
  type BrandInput,
  brandQueryKeys,
  createBrand,
  updateBrand,
} from "../../lib/brands"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const GPSR_EMAIL_FIELDS = [
  "gpsr_contact_email",
  "gpsr_european_reseller_contact_email",
] as const
const GPSR_REPRESENTATIVE_FIELDS = [
  "gpsr_european_reseller_manufacturing_company_name",
  "gpsr_european_reseller_postal_address",
  "gpsr_european_reseller_contact_email",
] as const

export type BrandFormState = {
  attributes: BrandAttribute[]
  gpsr_contact_email: string
  gpsr_european_reseller_contact_email: string
  gpsr_european_reseller_manufacturing_company_name: string
  gpsr_european_reseller_postal_address: string
  gpsr_manufactured_outside_eu: boolean
  gpsr_manufacturing_company_name: string
  gpsr_postal_address: string
  handle: string
  title: string
}

type BrandFormErrors = Partial<Record<keyof BrandFormState, string>>

const emptyAttribute = (
  attributeTypes: BrandAttributeType[] = [],
  selectedNames = new Set<string>()
): BrandAttribute => ({
  name:
    attributeTypes.find(
      (attributeType) =>
        !(attributeType.deleted_at || selectedNames.has(attributeType.name))
    )?.name ?? "",
  value: "",
})

export const toBrandFormState = (brand?: Brand): BrandFormState => ({
  attributes: brand?.attributes.length
    ? brand.attributes.filter(
        (attribute) => !attribute.attribute_type_deleted_at
      )
    : [],
  gpsr_contact_email: brand?.gpsr_contact_email ?? "",
  gpsr_european_reseller_contact_email:
    brand?.gpsr_european_reseller_contact_email ?? "",
  gpsr_european_reseller_manufacturing_company_name:
    brand?.gpsr_european_reseller_manufacturing_company_name ?? "",
  gpsr_european_reseller_postal_address:
    brand?.gpsr_european_reseller_postal_address ?? "",
  gpsr_manufactured_outside_eu: brand?.gpsr_manufactured_outside_eu ?? false,
  gpsr_manufacturing_company_name: brand?.gpsr_manufacturing_company_name ?? "",
  gpsr_postal_address: brand?.gpsr_postal_address ?? "",
  handle: brand?.handle ?? "",
  title: brand?.title ?? "",
})

const trimmedOrNull = (value: string) => value.trim() || null

const toBrandInput = (form: BrandFormState): BrandInput => ({
  attributes: form.attributes
    .map((attribute) => ({
      name: attribute.name.trim(),
      value: attribute.value,
    }))
    .filter((attribute) => attribute.name.length > 0),
  gpsr_contact_email: trimmedOrNull(form.gpsr_contact_email),
  gpsr_european_reseller_contact_email: trimmedOrNull(
    form.gpsr_european_reseller_contact_email
  ),
  gpsr_european_reseller_manufacturing_company_name: trimmedOrNull(
    form.gpsr_european_reseller_manufacturing_company_name
  ),
  gpsr_european_reseller_postal_address: trimmedOrNull(
    form.gpsr_european_reseller_postal_address
  ),
  gpsr_manufactured_outside_eu: form.gpsr_manufactured_outside_eu,
  gpsr_manufacturing_company_name: trimmedOrNull(
    form.gpsr_manufacturing_company_name
  ),
  gpsr_postal_address: trimmedOrNull(form.gpsr_postal_address),
  handle: form.handle.trim() || undefined,
  title: form.title.trim(),
})

const validateBrandForm = (
  form: BrandFormState,
  messages: { invalidEmail: string; mustBeEmpty: string; required: string }
) => {
  const errors: BrandFormErrors = {}

  if (!form.title.trim()) {
    errors.title = messages.required
  }

  for (const field of GPSR_EMAIL_FIELDS) {
    const value = form[field].trim()
    if (value && !EMAIL_PATTERN.test(value)) {
      errors[field] = messages.invalidEmail
    }
  }

  for (const field of GPSR_REPRESENTATIVE_FIELDS) {
    const isPresent = form[field].trim().length > 0
    const isInvalid = form.gpsr_manufactured_outside_eu ? !isPresent : isPresent
    if (isInvalid) {
      errors[field] = form.gpsr_manufactured_outside_eu
        ? messages.required
        : messages.mustBeEmpty
    }
  }

  return errors
}

type TextFieldName = Exclude<
  keyof BrandFormState,
  "attributes" | "gpsr_manufactured_outside_eu"
>

const BrandTextField = ({
  errors,
  form,
  id,
  label,
  name,
  required = false,
  setErrors,
  setForm,
  type,
}: {
  errors: BrandFormErrors
  form: BrandFormState
  id: string
  label: string
  name: TextFieldName
  required?: boolean
  setErrors: Dispatch<SetStateAction<BrandFormErrors>>
  setForm: Dispatch<SetStateAction<BrandFormState>>
  type?: "email"
}) => {
  const error = errors[name]
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : null}
      </Label>
      <Input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={!!error}
        aria-required={required}
        id={id}
        onChange={(event) => {
          setForm((current) => ({
            ...current,
            [name]: event.target.value,
          }))
          setErrors((current) => ({ ...current, [name]: undefined }))
        }}
        required={required}
        type={type}
        value={form[name]}
      />
      {error ? (
        <Text
          className="text-ui-fg-error"
          id={errorId}
          role="alert"
          size="small"
        >
          {error}
        </Text>
      ) : null}
    </div>
  )
}

const BrandFormFields = ({
  attributeTypes,
  errors,
  form,
  idPrefix,
  setErrors,
  setForm,
}: {
  attributeTypes: BrandAttributeType[]
  errors: BrandFormErrors
  form: BrandFormState
  idPrefix: string
  setErrors: Dispatch<SetStateAction<BrandFormErrors>>
  setForm: Dispatch<SetStateAction<BrandFormState>>
}) => {
  const { t } = useTranslation("brands")
  const required = form.gpsr_manufactured_outside_eu
  const selectedAttributeNames = new Set(
    form.attributes
      .map((attribute) => attribute.name)
      .filter((name): name is string => !!name)
  )
  const canAddAttribute = attributeTypes.some(
    (attributeType) =>
      !(
        attributeType.deleted_at ||
        selectedAttributeNames.has(attributeType.name)
      )
  )

  const updateAttribute = (
    index: number,
    key: keyof BrandAttribute,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      attributes: current.attributes.map((attribute, currentIndex) =>
        currentIndex === index ? { ...attribute, [key]: value } : attribute
      ),
    }))
  }

  const getAttributeOptions = (selectedName: string) => {
    const selectedNames = new Set(
      form.attributes
        .map((attribute) => attribute.name)
        .filter((name) => name && name !== selectedName)
    )

    return attributeTypes.filter(
      (attributeType) =>
        !(attributeType.deleted_at || selectedNames.has(attributeType.name))
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BrandTextField
        errors={errors}
        form={form}
        id={`${idPrefix}-title`}
        label={t("fields.title")}
        name="title"
        required
        setErrors={setErrors}
        setForm={setForm}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={`${idPrefix}-handle`}>{t("fields.handle")}</Label>
        <Input
          id={`${idPrefix}-handle`}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              handle: event.target.value,
            }))
          }
          placeholder={t("form.handlePlaceholder")}
          value={form.handle}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Text leading="compact" size="small" weight="plus">
          {t("fields.gpsr")}
        </Text>
        <div className="grid gap-3 md:grid-cols-2">
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-manufacturing-company-name`}
            label={t("fields.gpsr_manufacturing_company_name")}
            name="gpsr_manufacturing_company_name"
            setErrors={setErrors}
            setForm={setForm}
          />
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-postal-address`}
            label={t("fields.gpsr_postal_address")}
            name="gpsr_postal_address"
            setErrors={setErrors}
            setForm={setForm}
          />
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-contact-email`}
            label={t("fields.gpsr_contact_email")}
            name="gpsr_contact_email"
            setErrors={setErrors}
            setForm={setForm}
            type="email"
          />
          <div className="flex items-center gap-3 rounded-md border border-ui-border-base px-3 py-2">
            <Checkbox
              checked={form.gpsr_manufactured_outside_eu}
              id={`${idPrefix}-gpsr-manufactured-outside-eu`}
              onCheckedChange={(checked) => {
                const isOutsideEu = checked === true
                setForm((current) => ({
                  ...current,
                  gpsr_european_reseller_contact_email: isOutsideEu
                    ? current.gpsr_european_reseller_contact_email
                    : "",
                  gpsr_european_reseller_manufacturing_company_name: isOutsideEu
                    ? current.gpsr_european_reseller_manufacturing_company_name
                    : "",
                  gpsr_european_reseller_postal_address: isOutsideEu
                    ? current.gpsr_european_reseller_postal_address
                    : "",
                  gpsr_manufactured_outside_eu: isOutsideEu,
                }))
                setErrors((current) => ({
                  ...current,
                  gpsr_european_reseller_contact_email: undefined,
                  gpsr_european_reseller_manufacturing_company_name: undefined,
                  gpsr_european_reseller_postal_address: undefined,
                }))
              }}
            />
            <Label htmlFor={`${idPrefix}-gpsr-manufactured-outside-eu`}>
              {t("fields.gpsr_manufactured_outside_eu")}
            </Label>
          </div>
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-eu-company-name`}
            label={t(
              "fields.gpsr_european_reseller_manufacturing_company_name"
            )}
            name="gpsr_european_reseller_manufacturing_company_name"
            required={required}
            setErrors={setErrors}
            setForm={setForm}
          />
          <BrandTextField
            errors={errors}
            form={form}
            id={`${idPrefix}-gpsr-eu-address`}
            label={t("fields.gpsr_european_reseller_postal_address")}
            name="gpsr_european_reseller_postal_address"
            required={required}
            setErrors={setErrors}
            setForm={setForm}
          />
          <div className="md:col-span-2">
            <BrandTextField
              errors={errors}
              form={form}
              id={`${idPrefix}-gpsr-eu-email`}
              label={t("fields.gpsr_european_reseller_contact_email")}
              name="gpsr_european_reseller_contact_email"
              required={required}
              setErrors={setErrors}
              setForm={setForm}
              type="email"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Text leading="compact" size="small" weight="plus">
            {t("attributes.title")}
          </Text>
          <Button
            disabled={!canAddAttribute}
            onClick={() =>
              setForm((current) => ({
                ...current,
                attributes: [
                  ...current.attributes,
                  emptyAttribute(attributeTypes, selectedAttributeNames),
                ],
              }))
            }
            size="small"
            type="button"
            variant="secondary"
          >
            {t("actions.add")}
          </Button>
        </div>
        {form.attributes.length ? (
          form.attributes.map((attribute, index) => (
            <div
              className="grid grid-cols-[1fr_1fr_auto] gap-2"
              key={`${attribute.id ?? "new"}-${index}`}
            >
              <Select
                onValueChange={(value) => updateAttribute(index, "name", value)}
                value={attribute.name}
              >
                <Select.Trigger>
                  <Select.Value placeholder={t("fields.attribute")} />
                </Select.Trigger>
                <Select.Content>
                  {getAttributeOptions(attribute.name).map((attributeType) => (
                    <Select.Item
                      key={attributeType.id}
                      value={attributeType.name}
                    >
                      {attributeType.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Input
                onChange={(event) =>
                  updateAttribute(index, "value", event.target.value)
                }
                placeholder={t("fields.value")}
                value={attribute.value}
              />
              <Button
                aria-label={t("actions.remove")}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    attributes: current.attributes.filter(
                      (_, currentIndex) => currentIndex !== index
                    ),
                  }))
                }
                size="small"
                type="button"
                variant="secondary"
              >
                <Trash />
              </Button>
            </div>
          ))
        ) : (
          <Text className="text-ui-fg-subtle" size="small">
            {t("attributes.empty")}
          </Text>
        )}
      </div>
    </div>
  )
}

const useBrandFormState = (brand: Brand | undefined, open: boolean) => {
  const [form, setForm] = useState<BrandFormState>(() =>
    toBrandFormState(brand)
  )
  const [errors, setErrors] = useState<BrandFormErrors>({})
  const lastOpen = useRef(false)
  const lastBrandId = useRef<string | undefined>(brand?.id)

  useEffect(() => {
    if (open && (!lastOpen.current || lastBrandId.current !== brand?.id)) {
      setForm(toBrandFormState(brand))
      setErrors({})
    }

    lastOpen.current = open
    lastBrandId.current = brand?.id
  }, [brand, open])

  return { errors, form, setErrors, setForm }
}

const useValidatedSubmit = (
  form: BrandFormState,
  setErrors: Dispatch<SetStateAction<BrandFormErrors>>,
  submit: (input: BrandInput) => void
) => {
  const { t } = useTranslation("brands")

  return () => {
    const nextErrors = validateBrandForm(form, {
      invalidEmail: t("validation.invalidEmail"),
      mustBeEmpty: t("validation.mustBeEmpty"),
      required: t("validation.required"),
    })

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors)
      toast.error(t("validation.summary"))
      return
    }

    submit(toBrandInput(form))
  }
}

export const BrandCreateModal = ({
  attributeTypes,
  onOpenChange,
  open,
}: {
  attributeTypes: BrandAttributeType[]
  onOpenChange: (open: boolean) => void
  open: boolean
}) => {
  const { t } = useTranslation("brands")
  const queryClient = useQueryClient()
  const { errors, form, setErrors, setForm } = useBrandFormState(
    undefined,
    open
  )
  const mutation = useMutation({
    mutationFn: createBrand,
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveBrandFailed")
      )
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.attributeTypesLists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.attributeTypeDetails(),
        }),
      ])
      toast.success(t("toasts.brandCreated"))
      onOpenChange(false)
    },
  })
  const save = useValidatedSubmit(form, setErrors, mutation.mutate)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!mutation.isPending) {
      onOpenChange(nextOpen)
    }
  }

  return (
    <FocusModal onOpenChange={handleOpenChange} open={open}>
      <FocusModal.Content
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) {
            event.preventDefault()
          }
        }}
      >
        <FocusModal.Header>
          <FocusModal.Title>{t("form.createBrand")}</FocusModal.Title>
        </FocusModal.Header>
        <FocusModal.Body className="flex justify-center overflow-y-auto px-6 py-8">
          <div className="w-full max-w-3xl">
            <BrandFormFields
              attributeTypes={attributeTypes}
              errors={errors}
              form={form}
              idPrefix="brand-create"
              setErrors={setErrors}
              setForm={setForm}
            />
          </div>
        </FocusModal.Body>
        <FocusModal.Footer>
          <div className="flex items-center justify-end gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => handleOpenChange(false)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={mutation.isPending}
              isLoading={mutation.isPending}
              onClick={save}
              size="small"
              type="button"
            >
              {t("actions.save")}
            </Button>
          </div>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  )
}

export const BrandEditDrawer = ({
  attributeTypes,
  brand,
  onOpenChange,
  open,
}: {
  attributeTypes: BrandAttributeType[]
  brand: Brand
  onOpenChange: (open: boolean) => void
  open: boolean
}) => {
  const { t } = useTranslation("brands")
  const queryClient = useQueryClient()
  const { errors, form, setErrors, setForm } = useBrandFormState(brand, open)
  const mutation = useMutation({
    mutationFn: (input: BrandInput) => updateBrand(brand.id, input),
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : t("errors.saveBrandFailed")
      )
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.detail(brand.id),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.lists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.attributeTypesLists(),
        }),
        queryClient.invalidateQueries({
          queryKey: brandQueryKeys.attributeTypeDetails(),
        }),
      ])
      toast.success(t("toasts.brandUpdated"))
      onOpenChange(false)
    },
  })
  const save = useValidatedSubmit(form, setErrors, mutation.mutate)
  const handleOpenChange = (nextOpen: boolean) => {
    if (!mutation.isPending) {
      onOpenChange(nextOpen)
    }
  }

  return (
    <Drawer onOpenChange={handleOpenChange} open={open}>
      <Drawer.Content
        onEscapeKeyDown={(event) => {
          if (mutation.isPending) {
            event.preventDefault()
          }
        }}
      >
        <Drawer.Header>
          <Drawer.Title>{t("form.editBrand")}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto">
          <BrandFormFields
            attributeTypes={attributeTypes}
            errors={errors}
            form={form}
            idPrefix={`brand-edit-${brand.id}`}
            setErrors={setErrors}
            setForm={setForm}
          />
        </Drawer.Body>
        <Drawer.Footer>
          <div className="flex items-center justify-end gap-2">
            <Button
              disabled={mutation.isPending}
              onClick={() => handleOpenChange(false)}
              size="small"
              type="button"
              variant="secondary"
            >
              {t("actions.cancel")}
            </Button>
            <Button
              disabled={mutation.isPending}
              isLoading={mutation.isPending}
              onClick={save}
              size="small"
              type="button"
            >
              {t("actions.save")}
            </Button>
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}
