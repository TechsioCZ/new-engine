/**
 * Link mapping for the UX guidelines pages (see ux-markdown.tsx).
 *
 * The markdown lives in the skills (`libs/ui/skills/<name>-usage/references/ux.md` and
 * `libs/ui/skills/ux-guidelines/references/<topic>.md`) and links relative to the skill bundle.
 * These helpers turn those links into Storybook docs paths. Kept free of Storybook imports so the
 * ux-docs test can run them in Node.
 */

/** UX/ pattern pages: reference file name → Storybook docs title. */
export const UX_TOPIC_TITLES: Record<string, string> = {
  introduction: "UX/Introduction",
  "ux-writing": "UX/Writing",
  formatting: "UX/Formatting",
  states: "UX/States",
  "feedback-and-actions": "UX/Feedback and actions",
  "component-selection": "UX/Component selection",
  "value-lifecycle": "UX/Value lifecycle",
  accessibility: "UX/Accessibility",
}

/** Components with a UX guidelines page: usage skill name → component story title. */
export const UX_COMPONENT_TITLES: Record<string, string> = {
  accordion: "Molecules/Accordion",
  "action-icon": "Atoms/ActionIcon",
  "availability-status": "Molecules/AvailabilityStatus",
  badge: "Atoms/Badge",
  breadcrumb: "Molecules/Breadcrumb",
  button: "Atoms/Button",
  carousel: "Molecules/Carousel",
  "cascade-select": "Molecules/CascadeSelect",
  chart: "Molecules/Chart",
  checkbox: "Atoms/Checkbox",
  "color-select": "Molecules/ColorSelect",
  combobox: "Molecules/Combobox",
  command: "Molecules/Command",
  "data-table": "Organisms/DataTable",
  "date-picker": "Molecules/DatePicker",
  dialog: "Molecules/Dialog",
  drawer: "Molecules/Drawer",
  "facet-filter-panel": "Templates/FacetFilterPanel",
  "file-upload": "Molecules/FileUpload",
  footer: "Organisms/Footer",
  "form-checkbox": "Molecules/FormCheckbox",
  "form-error-summary": "Molecules/FormErrorSummary",
  "form-input": "Molecules/FormInput",
  "form-numeric-input": "Molecules/FormNumericInput",
  "form-textarea": "Molecules/FormTextarea",
  gallery: "Organisms/Gallery",
  header: "Organisms/Header",
  hotkeys: "Atoms/Hotkeys",
  icon: "Atoms/Icon",
  image: "Atoms/Image",
  input: "Atoms/Input",
  label: "Atoms/Label",
  "line-item": "Organisms/LineItem",
  link: "Atoms/Link",
  "link-button": "Atoms/LinkButton",
  menu: "Molecules/Menu",
  "numeric-input": "Atoms/NumericInput",
  pagination: "Molecules/Pagination",
  "phone-input": "Molecules/PhoneInput",
  popover: "Molecules/Popover",
  "price-block": "Molecules/PriceBlock",
  "product-card": "Molecules/ProductCard",
  "quantity-field": "Molecules/QuantityField",
  "radio-card": "Molecules/RadioCard",
  "radio-group": "Molecules/RadioGroup",
  rating: "Atoms/Rating",
  "search-form": "Molecules/SearchForm",
  "search-suggestions": "Templates/SearchSuggestions",
  select: "Molecules/Select",
  sidebar: "Organisms/Sidebar",
  skeleton: "Atoms/Skeleton",
  slider: "Molecules/Slider",
  "status-text": "Atoms/StatusText",
  steps: "Brief",
  switch: "Molecules/Switch",
  table: "Organisms/Table",
  tabs: "Molecules/Tabs",
  textarea: "Atoms/Textarea",
  toast: "Molecules/Toast",
  tooltip: "Atoms/Tooltip",
  "totals-summary": "Molecules/TotalsSummary",
  tour: "Make yourself at home",
  "tree-view": "Molecules/TreeView",
  "vertical-navigation": "Molecules/VerticalNavigation",
}

const NON_ID_CHARACTERS = /[^a-z0-9]+/g
const EDGE_DASHES = /^-+|-+$/g
const PASS_THROUGH_LINK = /^(?:https?:|mailto:|#|\?)/

export const toStoryId = (title: string) =>
  title.toLowerCase().replace(NON_ID_CHARACTERS, "-").replace(EDGE_DASHES, "")

const COMPONENT_LINK = /(?:^|\/)([a-z0-9-]+)-usage\/references\/ux\.md(?:#.*)?$/
const TOPIC_LINK = /(?:^|\/)([a-z0-9-]+)\.md(?:#.*)?$/
const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g
const HTML_COMMENT = /<!--[\s\S]*?-->\n?/g

/** Map a skill-relative link to a Storybook docs path, or null when no page exists. */
export function toStorybookHref(href: string): string | null {
  if (PASS_THROUGH_LINK.test(href)) {
    return href
  }
  const component = COMPONENT_LINK.exec(href)?.[1]
  if (component) {
    const title = UX_COMPONENT_TITLES[component]
    return title ? `?path=/docs/${toStoryId(title)}--ux-guidelines` : null
  }
  const topic = TOPIC_LINK.exec(href)?.[1]
  if (topic && topic !== "ux" && UX_TOPIC_TITLES[topic]) {
    return `?path=/docs/${toStoryId(UX_TOPIC_TITLES[topic])}--docs`
  }
  return null
}

/** Rewrite skill-relative links and drop source comments; exported for tests. */
export function toStorybookMarkdown(source: string): string {
  return source
    .replace(HTML_COMMENT, "")
    .replace(MARKDOWN_LINK, (_match, text: string, href: string) => {
      const target = toStorybookHref(href)
      return target ? `[${text}](${target})` : text
    })
}
