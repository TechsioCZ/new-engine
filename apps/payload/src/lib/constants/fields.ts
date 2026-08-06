import type { DateField, RichTextField, SelectField, TextField } from "payload"

import { fieldLabels } from "./labels"
import { statusOptions } from "./status-options"

/** Locale-aware label shape for Payload admin fields. */
type LocalizedLabel = Record<string, string>

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
  description: LocalizedLabel
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
  label: options.label ?? fieldLabels.title,
  localized: options.localized ?? true,
  ...(options.maxLength === undefined || options.maxLength === 0
    ? {}
    : { maxLength: options.maxLength }),
  name: "title",
  required: options.required ?? true,
  type: "text",
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
  ...(options.admin === undefined ? {} : { admin: options.admin }),
  ...(options.editor === undefined ? {} : { editor: options.editor }),
  label: options.label ?? fieldLabels.content,
  localized: options.localized ?? true,
  name: "content",
  required: options.required ?? true,
  type: "richText",
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
