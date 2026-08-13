import type { TextField } from "payload"

type TextFieldAdmin = NonNullable<TextField["admin"]>

type MedusaProductReferenceFieldOptions = {
  description?: TextFieldAdmin["description"]
  label?: TextField["label"]
}

export const createMedusaProductReferenceField = (
  options: MedusaProductReferenceFieldOptions = {}
): TextField => ({
  name: "productExternalId",
  type: "text",
  label: options.label ?? "Product",
  admin: {
    description: options.description,
    components: {
      Field:
        "/components/admin/medusa-product-reference-field#MedusaProductReferenceField",
    },
  },
})
