// Prop renames for the unified style props (size / appearance / severity /
// validateStatus). Keyed by the component as imported from @techsio/ui-kit,
// with compound parts written as "Parent.Part".

export const THEME_TO_APPEARANCE = {
  solid: "solid",
  light: "subtle",
  outlined: "outline",
  borderless: "ghost",
}

const same = (value) => value

/** Button family: `variant` was color, `theme` was fill style. */
export const BUTTON_RULE = {
  variant: { to: "severity", map: same },
  theme: {
    to: "appearance",
    map: (v) => THEME_TO_APPEARANCE[v] ?? v,
    special: { unstyled: [["unstyled", true]] },
  },
}

const appearance = (map = {}) => ({
  variant: { to: "appearance", map: (v) => map[v] ?? v },
})

export const RULES = {
  Badge: {
    variant: {
      to: "severity",
      map: (v) => v,
      special: {
        outline: [
          ["appearance", "outline"],
          ["severity", "neutral"],
        ],
        dynamic: [["severity", "custom"]],
      },
    },
  },
  Skeleton: { variant: { to: "severity", map: same } },
  "Skeleton.Circle": { variant: { to: "severity", map: same } },
  "Skeleton.Rectangle": { variant: { to: "severity", map: same } },
  "Skeleton.Text": { variant: { to: "severity", map: same } },
  Icon: { color: { to: "severity", map: same } },
  ActionIcon: { tone: { to: "severity", map: same } },
  "Sidebar.CloseTrigger": { tone: { to: "severity", map: same } },
  "VerticalNavigation.BranchContent": {
    tone: { to: "appearance", map: (v) => (v === "accent" ? "solid" : v) },
    variant: { to: "severity", map: same },
  },
  "VerticalNavigation.Group": {
    tone: { to: "appearance", map: (v) => (v === "accent" ? "solid" : v) },
    variant: { to: "severity", map: same },
  },
  Pagination: appearance({
    filled: "solid",
    outlined: "outline",
    minimal: "ghost",
  }),
  RadioGroup: appearance(),
  RadioCard: appearance(),
  Steps: appearance(),
  "Steps.RootProvider": appearance(),
  Table: appearance(),
  DataTable: appearance(),
  Breadcrumb: appearance(),
  BreadcrumbTemplate: appearance(),
  Tabs: appearance({ default: "underline" }),
  TabsTemplate: appearance({ default: "underline" }),
  Tooltip: appearance({ default: "solid" }),
  Accordion: {
    variant: {
      to: "appearance",
      map: (v) => ({ default: "outline", borderless: "plain" })[v] ?? v,
      special: {
        child: [
          ["appearance", "plain"],
          ["nested", true],
        ],
      },
    },
  },
  AccordionTemplate: {
    variant: {
      to: "appearance",
      map: (v) => ({ default: "outline", borderless: "plain" })[v] ?? v,
      special: {
        child: [
          ["appearance", "plain"],
          ["nested", true],
        ],
      },
    },
  },
  Input: { variant: { to: "validateStatus", map: same } },
  FormInput: { variant: { to: "validateStatus", map: same } },
  Textarea: {
    variant: {
      to: "validateStatus",
      map: same,
      special: { borderless: [["appearance", "plain"]] },
    },
  },
  FormTextarea: {
    variant: {
      to: "validateStatus",
      map: same,
      special: { borderless: [["appearance", "plain"]] },
    },
  },
  "Sidebar.Pane": { size: { to: "paneSize", map: same } },
  "ProductCard.Button": {
    buttonVariant: { to: "action", map: same },
    ...BUTTON_RULE,
  },
  Button: BUTTON_RULE,
  LinkButton: BUTTON_RULE,
}

// Compound parts that forward Button props without a rule of their own.
const BUTTON_PART = /(Trigger|Button|Remove|Action|Control)$/

export function ruleFor(component) {
  if (RULES[component]) {
    return RULES[component]
  }
  const part = component.split(".").pop()
  return component.includes(".") && BUTTON_PART.test(part) ? BUTTON_RULE : null
}
