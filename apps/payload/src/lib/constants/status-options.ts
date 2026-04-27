import type { Option } from 'payload'

/** Select options for common publish status values. */
export const statusOptions: Option[] = [
  {
    label: {
      en: 'Draft',
      cs: 'Koncept',
      sk: 'Koncept',
    },
    value: 'draft',
  },
  {
    label: {
      en: 'Published',
      cs: 'Publikované',
      sk: 'Publikované',
    },
    value: 'published',
  },
  {
    label: {
      en: 'Archived',
      cs: 'Archivováno',
      sk: 'Archivované',
    },
    value: 'archived',
  },
]
