import type { Option } from "payload"

/** Select options for common publish status values. */
export const statusOptions: Option[] = [
  {
    label: {
      cs: "Koncept",
      en: "Draft",
      sk: "Koncept",
    },
    value: "draft",
  },
  {
    label: {
      cs: "Publikované",
      en: "Published",
      sk: "Publikované",
    },
    value: "published",
  },
  {
    label: {
      cs: "Archivováno",
      en: "Archived",
      sk: "Archivované",
    },
    value: "archived",
  },
]
