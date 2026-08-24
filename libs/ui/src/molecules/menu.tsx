/**
 * Menu — @techsio/ui-kit molecule.
 *
 * @component Menu
 * @componentVersion v1.1.0
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
    // Checkbox/radio rows signal selection the same way Select and Combobox
    // do — accent foreground plus the indicator glyph, never a weight change
    // (which would reflow the label on every toggle).
    // Selection reads as accent foreground + the trailing check — never a
    // weight change (which reflows the label on every toggle). Unlike Select,
    // checkable menu rows get no background tint: selection here is not
    // exclusive, so tinting most of the list would drown the highlight state.
    optionItem: ["data-[state=checked]:text-popup-item-fg-selected"],
    separator: [
      "my-menu-separator-margin",
      "h-menu-separator",
      "bg-menu-separator-bg",
    ],
    itemText: ["min-w-0 flex-grow truncate"],
    // Trailing, always rendered (empty when unchecked) so toggling a row
    // never reflows its label.
    itemIndicator: [
      "-translate-y-1/2 absolute end-(--popup-item-x) top-1/2",
      "flex items-center justify-center",
      "size-(--size-popup-indicator) text-popup-item-fg-selected",
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

// === SUBMENU COMPONENT ===
interface SubmenuItemProps {
  item: SubmenuMenuItem
  parentApi: menu.Api
  parentService: menu.Service
  size?: "xs" | "sm" | "md" | "lg"
  onCheckedChange?: (item: MenuItem, checked: boolean) => void
  onSelect?: (details: { value: string }) => void
  closeOnSelect?: boolean
}

// ! TODO: Fix menu.machine typing, it should work without 'as any'
function SubmenuItem({
  item,
  parentApi,
  parentService,
  size = "md",
  onCheckedChange,
  onSelect,
  closeOnSelect = true,
}: SubmenuItemProps) {
  const submenuService = useMachine(menu.machine as any, {
    id: useId(),
    closeOnSelect,
    onSelect,
  })

  const submenuApi = menu.connect(submenuService as any, normalizeProps)

  useEffect(() => {
    // Setup parent-child relationship
    parentApi.setChild(submenuService as any)
    submenuApi.setParent(parentService)
  }, [parentApi, submenuApi, submenuService, parentService])

  const {
    positioner,
    content,
    separator,
    optionItem,
    item: itemSlot,
    itemIcon,
    itemText,
    itemIndicator,
    submenuIndicator,
  } = menuVariants({ size })

  const renderMenuItem = (menuItem: MenuItem) => {
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
          parentApi={submenuApi}
          parentService={submenuService as any}
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
          {...(submenuApi.getOptionItemProps({
            type: menuItem.type,
            value: menuItem.value,
            checked: menuItem.checked,
            onCheckedChange: (checked) => {
              onCheckedChange?.(menuItem, checked)
            },
          }) as any)}
        >
          <span className={itemText()}>{menuItem.label}</span>
          <span className={itemIndicator()}>
            {menuItem.checked && (
              <Icon icon="token-icon-check" size="current" />
            )}
          </span>
        </li>
      )
    }

    // Handle action items
    return (
      <li
        className={itemSlot()}
        key={menuItem.value}
        {...(submenuApi.getItemProps({
          value: menuItem.value,
          disabled: menuItem.disabled,
        }) as any)}
      >
        {menuItem.icon && <Icon className={itemIcon()} icon={menuItem.icon} />}
        <span className={itemText()}>{menuItem.label}</span>
      </li>
    )
  }

  // Get trigger props from parent
  const triggerProps = parentApi.getTriggerItemProps(submenuApi)

  return (
    <>
      <li
        className={itemSlot()}
        {...(triggerProps as any)}
        data-disabled={item.disabled || undefined}
      >
        {item.icon && <Icon className={itemIcon()} icon={item.icon} />}
        <span className={itemText()}>{item.label}</span>
        <Icon className={submenuIndicator()} icon="token-icon-menu-submenu" />
      </li>

      <Portal>
        <div
          className={positioner()}
          {...(submenuApi.getPositionerProps() as any)}
        >
          <ul className={content()} {...(submenuApi.getContentProps() as any)}>
            {item.items.map(renderMenuItem)}
          </ul>
        </div>
      </Portal>
    </>
  )
}

// === COMPONENT PROPS ===
export interface MenuProps extends VariantProps<typeof menuVariants> {
  items: MenuItem[]
  triggerText?: string
  triggerIcon?: IconType
  customTrigger?: ReactNode
  className?: string
  onCheckedChange?: (item: MenuItem, checked: boolean) => void
  // menu.Props
  "aria-label"?: string
  dir?: "ltr" | "rtl"
  id?: string
  closeOnSelect?: boolean
  loopFocus?: boolean
  typeahead?: boolean
  positioning?: any
  anchorPoint?: any
  open?: boolean
  defaultOpen?: boolean
  composite?: boolean
  navigate?: (value: string) => void
  defaultHighlightedValue?: string
  highlightedValue?: string
  onHighlightChange?: (details: { highlightedValue: string | null }) => void
  onSelect?: (details: { value: string }) => void
  onOpenChange?: (details: { open: boolean }) => void
  onEscapeKeyDown?: (event: KeyboardEvent) => void
  onPointerDownOutside?: (event: PointerEvent) => void
  onInteractOutside?: (event: FocusEvent | PointerEvent) => void
  onFocusOutside?: (event: FocusEvent) => void
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

  const service = useMachine(menu.machine as any, {
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
    navigate,
    onSelect,
    onOpenChange,
    onEscapeKeyDown,
    onPointerDownOutside,
    onInteractOutside,
    onFocusOutside,
    onHighlightChange,
    "aria-label": ariaLabel,
  })

  const api = menu.connect(service as any, normalizeProps)

  const {
    trigger,
    positioner,
    content,
    separator,
    optionItem,
    item: itemSlot,
    itemIcon,
    itemText,
    itemIndicator,
  } = menuVariants({ size })

  const renderMenuItem = (item: MenuItem) => {
    // Handle separator
    if (item.type === "separator") {
      return <hr className={separator()} key={`separator-${item.id}`} />
    }

    // Handle submenu
    if (item.type === "submenu") {
      return (
        <SubmenuItem
          closeOnSelect={closeOnSelect}
          item={item}
          key={item.value}
          onCheckedChange={onCheckedChange}
          onSelect={onSelect}
          parentApi={api}
          parentService={service as any}
          size={size}
        />
      )
    }

    // Handle radio/checkbox items
    if (item.type === "radio" || item.type === "checkbox") {
      return (
        <li
          className={`${itemSlot()} ${optionItem()}`}
          key={item.value}
          {...(api.getOptionItemProps({
            type: item.type,
            value: item.value,
            checked: item.checked,
            onCheckedChange: (checked) => {
              onCheckedChange?.(item, checked)
            },
          }) as any)}
        >
          <span className={itemText()}>{item.label}</span>
          <span className={itemIndicator()}>
            {item.checked && <Icon icon="token-icon-check" size="current" />}
          </span>
        </li>
      )
    }

    // Handle action items
    return (
      <li
        className={itemSlot()}
        key={item.value}
        {...(api.getItemProps({
          value: item.value,
          disabled: item.disabled,
        }) as any)}
      >
        {item.icon && <Icon className={itemIcon()} icon={item.icon} />}
        <span className={itemText()}>{item.label}</span>
      </li>
    )
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
        <div className={positioner()} {...(api.getPositionerProps() as any)}>
          <ul className={content()} {...(api.getContentProps() as any)}>
            {items.map(renderMenuItem)}
          </ul>
        </div>
      </Portal>
    </>
  )
}

Menu.displayName = "Menu"
