import type { DateField, RichTextField, SelectField, TextField } from "payload"

import { fieldLabels } from "./labels"
import { statusOptions } from "./status-options"

/** Locale-aware label shape for Payload admin fields. */
type LocalizedLabel = Record<string, string>

/** Description text for localized fields. */
type Description = LocalizedLabel

/** Options for creating a standardized title field. */
interface TextFieldOptions {
  label?: LocalizedLabel
  required?: boolean
  localized?: boolean
  maxLength?: number
}

/** Options for creating a standardized slug field. */
interface SlugFieldOptions {
  label?: LocalizedLabel
  description: Description
  localized?: boolean
}

/** Options for creating a standardized rich text content field. */
interface ContentFieldOptions {
  label?: LocalizedLabel
  localized?: boolean
  editor: RichTextField["editor"]
  required?: boolean
  admin?: RichTextField["admin"]
}

/** Build a localized title field definition. */
export const createTitleField = (
  options: TextFieldOptions = {},
): TextField => ({
  name: "title",
  type: "text",
  required: options.required ?? true,
  localized: options.localized ?? true,
  ...(options.maxLength ? { maxLength: options.maxLength } : {}),
  label: options.label ?? fieldLabels.title,
})

/** Build a localized slug field definition with a description. */
export const createSlugField = (options: SlugFieldOptions): TextField => ({
  admin: {
    description: options.description,
  },
  label: options.label ?? fieldLabels.slug,
  localized: options.localized ?? true,
  name: "slug",
  required: true,
  type: "text",
  unique: true,
})

/** Build a localized rich text content field definition. */
export const createContentField = (
  options: ContentFieldOptions,
): RichTextField => ({
  name: "content",
  type: "richText",
  ...(options.editor ? { editor: options.editor } : {}),
  localized: options.localized ?? true,
  required: options.required ?? true,
  ...(options.admin ? { admin: options.admin } : {}),
  label: options.label ?? fieldLabels.content,
})

/** Build a shared status select field definition. */
export const createStatusField = (): SelectField => ({
  defaultValue: "draft",
  label: fieldLabels.status,
  name: "status",
  options: statusOptions,
  required: true,
  type: "select",
})

/** Build a published date field with a date-only picker. */
export const createPublishedDateField = (): DateField => ({
  admin: {
    date: {
      displayFormat: "dd.MM.yyyy",
      pickerAppearance: "dayOnly",
    },
  },
  defaultValue: () => new Date(),
  label: fieldLabels.publishDate,
  name: "publishedDate",
  required: true,
  type: "date",
})
