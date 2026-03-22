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
    positioner: ["w-(--reference-width)", "isolate z-(--z-index)"],
    content: [
      "border border-menu-content-border bg-menu-content-bg",
      "rounded-menu shadow-menu-content-shadow",
      "p-menu-content",
      "overflow-auto",
      "focus-visible:outline-none",
      "data-[state=open]:animate-in",
      "data-[state=closed]:animate-out",
      "motion-reduce:animate-none",
    ],
    item: [
      "flex items-center gap-menu-item",
      "cursor-pointer",
      "px-menu-item-x py-menu-item-y",
      "text-menu-item-fg",
      "rounded-menu-item",
      "hover:bg-menu-item-hover",
      "focus:bg-menu-item-hover focus-visible:outline-none",
      "data-[disabled]:cursor-not-allowed data-[disabled]:text-menu-fg-disabled",
      "data-[highlighted]:bg-menu-item-hover",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    optionItem: ["data-[state=checked]:font-semibold"],
    separator: [
      "my-menu-separator",
      "h-menu-separator",
      "bg-menu-separator-bg",
    ],
    itemText: ["flex-grow"],
    itemIcon: ["text-menu-item-icon-fg text-menu-item-icon-size"],
    submenuIndicator: [
      "ms-menu-submenu-indicator text-menu-submenu-indicator-fg",
    ],
  },
  variants: {
    size: {
      sm: {
        content: "text-sm",
        item: "text-sm",
      },
      md: {
        content: "text-md",
        item: "text-md",
      },
      lg: {
        content: "text-lg",
        item: "text-lg",
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
  size?: "sm" | "md" | "lg"
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
          {menuItem.checked && (
            <Icon className={itemIcon()} icon="token-icon-check" />
          )}
          <span className={itemText()}>{menuItem.label}</span>
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
          {/* Icon for checked state */}
          {item.checked && (
            <Icon className={itemIcon()} icon="token-icon-check" />
          )}
          <span className={itemText()}>{item.label}</span>
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
