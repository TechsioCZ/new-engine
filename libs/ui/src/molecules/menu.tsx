/**
 * Menu — @techsio/ui-kit molecule.
 *
 * @component Menu
 * @componentVersion v1.1.1
 * @skill menu-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the menu-usage skill's component_version and a changelog entry. Bump all three together.
 */
import * as menu from "@zag-js/menu"
import { normalizeProps, Portal, useMachine } from "@zag-js/react"
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useEffect,
  useId,
} from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { Icon, type IconType } from "../atoms/icon"

type ActionMenuItem = {
  type: "action"
  value: string
  label: string
  icon?: IconType
  disabled?: boolean
}

type RadioMenuItem = {
  type: "radio"
  value: string
  label: string
  name: string // radio group name
  checked: boolean
}

type CheckboxMenuItem = {
  type: "checkbox"
  value: string
  label: string
  checked: boolean
}

type SeparatorMenuItem = {
  type: "separator"
  id: string // pro key
}

type SubmenuMenuItem = {
  type: "submenu"
  value: string
  label: string
  icon?: IconType
  disabled?: boolean
  items: MenuItem[] // nested items
}

export type MenuItem =
  | ActionMenuItem
  | RadioMenuItem
  | CheckboxMenuItem
  | SeparatorMenuItem
  | SubmenuMenuItem

// === COMPONENT VARIANTS ===
const menuVariants = tv({
  slots: {
    trigger: "",
    // Zag sets `min-width: max-content` inline, so this resolves to
    // max(trigger width, content width) — the panel is never narrower than
    // the control that opened it.
    positioner: ["isolate w-(--reference-width)"],
    content: [
      "popup-surface-base",
      "w-full",
      "duration-200 ease-out motion-safe:transition-[opacity,display,translate,scale]",
      "transition-discrete",
      "starting:scale-98 starting:opacity-0",
      "data-[state=open]:starting:scale-98 data-[state=open]:starting:opacity-0",
      "data-[state=open]:scale-100 data-[state=open]:opacity-100",
      "data-[state=closed]:scale-98 data-[state=closed]:opacity-0",
    ],
    item: [
      "popup-item-base",
      "hover:bg-popup-item-bg-hover",
      "focus:bg-popup-item-bg-hover",
      "data-[highlighted]:bg-popup-item-bg-hover",
      "data-[disabled]:cursor-not-allowed data-[disabled]:text-popup-item-fg-disabled",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    // Selection reads as accent foreground + the trailing check — never a
    // weight change (which reflows the label on every toggle). Unlike Select,
    // checkable menu rows get no background tint: selection here is not
    // exclusive, so tinting most of the list would drown the highlight state.
    //
    // Because there is no filled background, this uses -fg-checked, NOT the
    // -fg-selected white that Select/Combobox use on their solid selected
    // fill. In light mode that white landed on the panel/hover tint at
    // ~1.4:1 and made checked rows unreadable; -fg-checked keeps the dark
    // half white, where it was already correct.
    optionItem: ["data-[state=checked]:text-popup-item-fg-checked"],
    separator: [
      "my-menu-separator-margin",
      "h-menu-separator",
      "bg-menu-separator-bg",
    ],
    itemText: ["min-w-0 flex-grow truncate"],
    // Trailing, always rendered (empty when unchecked) so toggling a row
    // never reflows its label.
    // Same reasoning as optionItem: the glyph sits on the bare panel, not on
    // a filled selected row, so it follows the checked foreground.
    itemIndicator: [
      "-translate-y-1/2 absolute end-(--popup-item-x) top-1/2",
      "flex items-center justify-center",
      "size-(--size-popup-indicator) text-popup-item-fg-checked",
    ],
    itemIcon: ["shrink-0 text-menu-item-icon text-popup-item-fg-muted"],
    submenuIndicator: [
      "ms-menu-submenu-indicator text-menu-submenu-indicator-fg",
    ],
  },
  variants: {
    size: {
      /* `xs` exists so parents whose own scale starts at xs (DataTable) can
       * forward `size` without it silently collapsing to `md`. */
      xs: {
        content: "popup-size-xs text-menu-xs",
      },
      sm: {
        content: "popup-size-sm text-menu-sm",
      },
      md: {
        content: "popup-size-md text-menu-md",
      },
      lg: {
        content: "popup-size-lg text-menu-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
  },
})

// === ITEM RENDERER (shared by root menu and submenus) ===
type MenuItemRenderContext = {
  // Machine that owns the rendered items (root menu or a submenu)
  api: menu.Api
  service: menu.Service
  slots: ReturnType<typeof menuVariants>
  size: SubmenuItemProps["size"]
  closeOnSelect: SubmenuItemProps["closeOnSelect"]
  onCheckedChange: SubmenuItemProps["onCheckedChange"]
  onSelect: SubmenuItemProps["onSelect"]
}

function renderMenuItem(
  menuItem: MenuItem,
  {
    api,
    service,
    slots,
    size,
    closeOnSelect,
    onCheckedChange,
    onSelect,
  }: MenuItemRenderContext
) {
  const {
    separator,
    optionItem,
    item: itemSlot,
    itemIcon,
    itemText,
    itemIndicator,
  } = slots

  // Handle separator
  if (menuItem.type === "separator") {
    return <hr className={separator()} key={`separator-${menuItem.id}`} />
  }

  // Handle submenu
  if (menuItem.type === "submenu") {
    return (
      <SubmenuItem
        closeOnSelect={closeOnSelect}
        item={menuItem}
        key={menuItem.value}
        onCheckedChange={onCheckedChange}
        onSelect={onSelect}
        parentApi={api}
        parentService={service}
        size={size}
      />
    )
  }

  // Handle radio/checkbox items
  if (menuItem.type === "radio" || menuItem.type === "checkbox") {
    return (
      <li
        className={`${itemSlot()} ${optionItem()}`}
        key={menuItem.value}
        {...api.getOptionItemProps({
          type: menuItem.type,
          value: menuItem.value,
          checked: menuItem.checked,
          onCheckedChange: (checked) => {
            onCheckedChange?.(menuItem, checked)
          },
        })}
      >
        <span className={itemText()}>{menuItem.label}</span>
        <span className={itemIndicator()}>
          {menuItem.checked && <Icon icon="token-icon-check" size="current" />}
        </span>
      </li>
    )
  }

  // Handle action items
  return (
    <li
      className={itemSlot()}
      key={menuItem.value}
      {...api.getItemProps({
        value: menuItem.value,
        disabled: menuItem.disabled,
      })}
    >
      {menuItem.icon && <Icon className={itemIcon()} icon={menuItem.icon} />}
      <span className={itemText()}>{menuItem.label}</span>
    </li>
  )
}

// === SUBMENU COMPONENT ===
type SubmenuItemProps = {
  item: SubmenuMenuItem
  parentApi: menu.Api
  parentService: menu.Service
  size?: "xs" | "sm" | "md" | "lg"
  onCheckedChange?: (item: MenuItem, checked: boolean) => void
  onSelect?: (details: { value: string }) => void
  closeOnSelect?: boolean
}

function SubmenuItem({
  item,
  parentApi,
  parentService,
  size = "md",
  onCheckedChange,
  onSelect,
  closeOnSelect = true,
}: SubmenuItemProps) {
  const submenuService = useMachine(menu.machine, {
    id: useId(),
    closeOnSelect,
    onSelect,
  })

  const submenuApi = menu.connect(submenuService, normalizeProps)

  useEffect(() => {
    // Setup parent-child relationship
    parentApi.setChild(submenuService)
    submenuApi.setParent(parentService)
  }, [parentApi, submenuApi, submenuService, parentService])

  const slots = menuVariants({ size })
  const {
    positioner,
    content,
    item: itemSlot,
    itemIcon,
    itemText,
    submenuIndicator,
  } = slots

  const itemContext: MenuItemRenderContext = {
    api: submenuApi,
    service: submenuService,
    slots,
    size,
    closeOnSelect,
    onCheckedChange,
    onSelect,
  }

  // Get trigger props from parent
  const triggerProps = parentApi.getTriggerItemProps(submenuApi)

  return (
    <>
      <li
        className={itemSlot()}
        {...triggerProps}
        data-disabled={item.disabled || undefined}
      >
        {item.icon && <Icon className={itemIcon()} icon={item.icon} />}
        <span className={itemText()}>{item.label}</span>
        <Icon className={submenuIndicator()} icon="token-icon-menu-submenu" />
      </li>

      <Portal>
        <div className={positioner()} {...submenuApi.getPositionerProps()}>
          <ul className={content()} {...submenuApi.getContentProps()}>
            {item.items.map((menuItem) =>
              renderMenuItem(menuItem, itemContext)
            )}
          </ul>
        </div>
      </Portal>
    </>
  )
}

// === COMPONENT PROPS ===
export type MenuProps = VariantProps<typeof menuVariants> &
  Pick<
    menu.Props,
    | "aria-label"
    | "dir"
    | "closeOnSelect"
    | "loopFocus"
    | "typeahead"
    | "positioning"
    | "anchorPoint"
    | "open"
    | "defaultOpen"
    | "composite"
    | "defaultHighlightedValue"
    | "highlightedValue"
    | "onHighlightChange"
    | "onSelect"
    | "onOpenChange"
    | "onEscapeKeyDown"
    | "onPointerDownOutside"
    | "onInteractOutside"
    | "onFocusOutside"
  > & {
    items: MenuItem[]
    triggerText?: string
    triggerIcon?: IconType
    customTrigger?: ReactNode
    className?: string
    onCheckedChange?: (item: MenuItem, checked: boolean) => void
    id?: string
    navigate?: (value: string) => void
  }
export function Menu({
  // NATIVE PROPS
  "aria-label": ariaLabel,
  dir,
  id,
  closeOnSelect = true,
  loopFocus = true,
  typeahead = true,
  positioning,
  anchorPoint,
  open,
  defaultOpen,
  composite,
  navigate,

  // Highlighted
  defaultHighlightedValue,
  highlightedValue,
  onHighlightChange,

  // event handlers
  onSelect,
  onOpenChange,
  onEscapeKeyDown,
  onPointerDownOutside,
  onInteractOutside,
  onFocusOutside,

  // CUSTOM PROPS
  items,
  triggerText = "Menu",
  triggerIcon,
  customTrigger,
  size = "md",
  onCheckedChange,
}: MenuProps) {
  const generatedId = useId()

  const service = useMachine(menu.machine, {
    id: id || generatedId,
    dir,
    closeOnSelect,
    loopFocus,
    typeahead,
    positioning,
    defaultHighlightedValue,
    highlightedValue,
    anchorPoint,
    open,
    defaultOpen,
    composite,
    navigate: navigate ? (details) => navigate(details.value) : undefined,
    onSelect,
    onOpenChange,
    onEscapeKeyDown,
    onPointerDownOutside,
    onInteractOutside,
    onFocusOutside,
    onHighlightChange,
    "aria-label": ariaLabel,
  })

  const api = menu.connect(service, normalizeProps)

  const slots = menuVariants({ size })
  const { trigger, positioner, content } = slots

  const itemContext: MenuItemRenderContext = {
    api,
    service,
    slots,
    size,
    closeOnSelect,
    onCheckedChange,
    onSelect,
  }

  return (
    <>
      {/* Trigger */}
      {customTrigger ? (
        isValidElement(customTrigger) ? (
          cloneElement(customTrigger as ReactElement, {
            ...api.getTriggerProps(),
          })
        ) : (
          <button {...api.getTriggerProps()}>{customTrigger}</button>
        )
      ) : (
        <Button {...api.getTriggerProps()} className={trigger()}>
          {triggerText}
          {triggerIcon && <Icon className="ms-1" icon={triggerIcon} />}
          {!triggerIcon && (
            <span {...api.getIndicatorProps()}>
              <Icon className="ms-1" icon="token-icon-menu-trigger" />
            </span>
          )}
        </Button>
      )}

      <Portal>
        <div className={positioner()} {...api.getPositionerProps()}>
          <ul className={content()} {...api.getContentProps()}>
            {items.map((item) => renderMenuItem(item, itemContext))}
          </ul>
        </div>
      </Portal>
    </>
  )
}

Menu.displayName = "Menu"
