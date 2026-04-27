import type {
  DateField,
  RichTextField,
  SelectField,
  TextField,
} from 'payload'

import { fieldLabels } from './labels'
import { statusOptions } from './status-options'

/** Locale-aware label shape for Payload admin fields. */
type LocalizedLabel = Record<string, string>

/** Description text for localized fields. */
type Description = LocalizedLabel

/** Options for creating a standardized title field. */
type TextFieldOptions = {
  label?: LocalizedLabel
  required?: boolean
  localized?: boolean
  maxLength?: number
}

/** Options for creating a standardized slug field. */
type SlugFieldOptions = {
  label?: LocalizedLabel
  description: Description
  localized?: boolean
}

/** Options for creating a standardized rich text content field. */
type ContentFieldOptions = {
  label?: LocalizedLabel
  localized?: boolean
  editor: RichTextField['editor']
  required?: boolean
  admin?: RichTextField['admin']
}

/** Build a localized title field definition. */
export const createTitleField = (options: TextFieldOptions = {}): TextField => ({
  name: 'title',
  type: 'text',
  required: options.required ?? true,
  localized: options.localized ?? true,
  ...(options.maxLength ? { maxLength: options.maxLength } : {}),
  label: options.label ?? fieldLabels.title,
})

/** Build a localized slug field definition with a description. */
export const createSlugField = (options: SlugFieldOptions): TextField => ({
  name: 'slug',
  type: 'text',
  required: true,
  unique: true,
  localized: options.localized ?? true,
  label: options.label ?? fieldLabels.slug,
  admin: {
    description: options.description,
  },
})

/** Build a localized rich text content field definition. */
export const createContentField = (options: ContentFieldOptions): RichTextField => ({
  name: 'content',
  type: 'richText',
  editor: options.editor,
  localized: options.localized ?? true,
  required: options.required ?? true,
  admin: options.admin,
  label: options.label ?? fieldLabels.content,
})

/** Build a shared status select field definition. */
export const createStatusField = (): SelectField => ({
  name: 'status',
  type: 'select',
  required: true,
  defaultValue: 'draft',
  label: fieldLabels.status,
  options: statusOptions,
})

/** Build a published date field with a date-only picker. */
export const createPublishedDateField = (): DateField => ({
  name: 'publishedDate',
  type: 'date',
  required: true,
  defaultValue: () => new Date(),
  label: fieldLabels.publishDate,
  admin: {
    date: {
      pickerAppearance: 'dayOnly',
      displayFormat: 'dd.MM.yyyy',
    },
  },
})
