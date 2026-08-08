/*
 * Menu — @techsio/ui-kit molecule.
 *
 * @component Menu
 * @componentVersion v1.0.1
 * @skill menu-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the menu-usage skill's component_version and a changelog entry. Bump all three together.
 */
import { connect, machine } from "@zag-js/menu"
import type { Api, Props as ZagMenuProps, Service } from "@zag-js/menu"
import { mergeProps, normalizeProps, Portal, useMachine } from "@zag-js/react"
import { createElement, isValidElement, useEffect, useId } from "react"
import type { ReactElement, ReactNode } from "react"
import { tv } from "tailwind-variants"
import type { VariantProps } from "tailwind-variants"

import { Button } from "../atoms/button"
import { Icon } from "../atoms/icon"
import type { IconType } from "../atoms/icon"

interface ActionMenuItem {
  type: "action"
  value: string
  label: string
  icon?: IconType | undefined
  disabled?: boolean | undefined
}

interface RadioMenuItem {
  type: "radio"
  value: string
  label: string
  // Radio group name shared by mutually exclusive items.
  name: string
  checked: boolean
}

interface CheckboxMenuItem {
  type: "checkbox"
  value: string
  label: string
  checked: boolean
}

interface SeparatorMenuItem {
  type: "separator"
  // Stable React key for the separator.
  id: string
}

interface SubmenuMenuItem {
  type: "submenu"
  value: string
  label: string
  icon?: IconType | undefined
  disabled?: boolean | undefined
  // Nested items rendered inside the submenu content.
  items: MenuItem[]
}

export type MenuItem =
  | ActionMenuItem
  | RadioMenuItem
  | CheckboxMenuItem
  | SeparatorMenuItem
  | SubmenuMenuItem

// === COMPONENT VARIANTS ===
const menuVariants = tv({
  defaultVariants: {
    size: "md",
  },
  slots: {
    content: [
      "border border-menu-content-border bg-menu-content-bg",
      "rounded-menu shadow-menu-content",
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
      "hover:bg-menu-item-bg-hover",
      "focus:bg-menu-item-bg-hover focus-visible:outline-none",
      "data-[disabled]:cursor-not-allowed data-[disabled]:text-menu-fg-disabled",
      "data-[highlighted]:bg-menu-item-bg-hover",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    itemIcon: ["text-menu-item-icon text-menu-item-icon-fg"],
    itemText: ["flex-grow"],
    optionItem: ["data-[state=checked]:font-semibold"],
    positioner: ["w-(--reference-width)", "isolate z-(--z-index)"],
    separator: [
      "my-menu-separator-margin",
      "h-menu-separator",
      "bg-menu-separator-bg",
    ],
    submenuIndicator: [
      "ms-menu-submenu-indicator text-menu-submenu-indicator-fg",
    ],
    trigger: "",
  },
  variants: {
    size: {
      lg: {
        content: "text-lg",
        item: "text-lg",
      },
      md: {
        content: "text-md",
        item: "text-md",
      },
      sm: {
        content: "text-sm",
        item: "text-sm",
      },
    },
  },
})

type MenuSize = NonNullable<VariantProps<typeof menuVariants>["size"]>

// === SUBMENU COMPONENT ===
interface SubmenuItemProps {
  item: SubmenuMenuItem
  parentApi: Api
  parentService: Service
  size?: MenuSize | undefined
  onCheckedChange?: ((item: MenuItem, checked: boolean) => void) | undefined
  onSelect?: ((details: { value: string }) => void) | undefined
  closeOnSelect?: boolean | undefined
}

const SubmenuItem = ({
  item,
  parentApi,
  parentService,
  size = "md",
  onCheckedChange,
  onSelect,
  closeOnSelect = true,
}: SubmenuItemProps): ReactElement => {
  const submenuService = useMachine(machine, {
    closeOnSelect,
    id: useId(),
    onSelect,
  })

  const submenuApi = connect(submenuService, normalizeProps)

  useEffect(() => {
    // Setup parent-child relationship
    parentApi.setChild(submenuService)
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
          parentService={submenuService}
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
          {...submenuApi.getOptionItemProps({
            checked: menuItem.checked,
            onCheckedChange: (checked) => {
              onCheckedChange?.(menuItem, checked)
            },
            type: menuItem.type,
            value: menuItem.value,
          })}
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
        {...submenuApi.getItemProps({
          disabled: menuItem.disabled,
          value: menuItem.value,
        })}
      >
        {menuItem.icon !== undefined && (
          <Icon className={itemIcon()} icon={menuItem.icon} />
        )}
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
        {...triggerProps}
        data-disabled={item.disabled === true ? true : undefined}
      >
        {item.icon !== undefined && (
          <Icon className={itemIcon()} icon={item.icon} />
        )}
        <span className={itemText()}>{item.label}</span>
        <Icon className={submenuIndicator()} icon="token-icon-menu-submenu" />
      </li>

      <Portal>
        <div className={positioner()} {...submenuApi.getPositionerProps()}>
          <ul className={content()} {...submenuApi.getContentProps()}>
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
  triggerText?: string | undefined
  triggerIcon?: IconType | undefined
  customTrigger?: ReactNode | undefined
  className?: string | undefined
  onCheckedChange?: ((item: MenuItem, checked: boolean) => void) | undefined
  // menu.Props
  "aria-label"?: string | undefined
  dir?: "ltr" | "rtl" | undefined
  id?: string | undefined
  closeOnSelect?: boolean | undefined
  loopFocus?: boolean | undefined
  typeahead?: boolean | undefined
  positioning?: ZagMenuProps["positioning"] | undefined
  anchorPoint?: ZagMenuProps["anchorPoint"] | undefined
  open?: boolean | undefined
  defaultOpen?: boolean | undefined
  composite?: boolean | undefined
  navigate?: ZagMenuProps["navigate"] | undefined
  defaultHighlightedValue?: string | undefined
  highlightedValue?: string | undefined
  onHighlightChange?: ZagMenuProps["onHighlightChange"] | undefined
  onSelect?: ((details: { value: string }) => void) | undefined
  onOpenChange?: ((details: { open: boolean }) => void) | undefined
  onEscapeKeyDown?: ZagMenuProps["onEscapeKeyDown"] | undefined
  onPointerDownOutside?: ZagMenuProps["onPointerDownOutside"] | undefined
  onInteractOutside?: ZagMenuProps["onInteractOutside"] | undefined
  onFocusOutside?: ZagMenuProps["onFocusOutside"] | undefined
}
export const Menu = ({
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
}: MenuProps) => {
  const generatedId = useId()

  const service = useMachine(machine, {
    anchorPoint,
    "aria-label": ariaLabel,
    closeOnSelect,
    defaultHighlightedValue,
    defaultOpen,
    dir,
    highlightedValue,
    id: id ?? generatedId,
    loopFocus,
    navigate,
    onEscapeKeyDown,
    onFocusOutside,
    onHighlightChange,
    onInteractOutside,
    onOpenChange,
    onPointerDownOutside,
    onSelect,
    open,
    typeahead,
    // `composite` and `positioning` are required once present on the machine
    // schema, so only forward them when the consumer supplied a value.
    ...(composite !== undefined && { composite }),
    ...(positioning !== undefined && { positioning }),
  })

  const api = connect(service, normalizeProps)

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
          parentService={service}
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
          {...api.getOptionItemProps({
            checked: item.checked,
            onCheckedChange: (checked) => {
              onCheckedChange?.(item, checked)
            },
            type: item.type,
            value: item.value,
          })}
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
        {...api.getItemProps({
          disabled: item.disabled,
          value: item.value,
        })}
      >
        {item.icon !== undefined && (
          <Icon className={itemIcon()} icon={item.icon} />
        )}
        <span className={itemText()}>{item.label}</span>
      </li>
    )
  }

  const renderTrigger = () => {
    if (isValidElement<Record<string, unknown>>(customTrigger)) {
      return createElement(
        customTrigger.type,
        mergeProps(api.getTriggerProps(), customTrigger.props),
      )
    }

    const hasCustomTrigger = Boolean(customTrigger)
    if (hasCustomTrigger) {
      return (
        <button {...api.getTriggerProps()} type="button">
          {customTrigger}
        </button>
      )
    }

    return (
      <Button {...api.getTriggerProps()} className={trigger()}>
        {triggerText}
        {triggerIcon !== undefined && (
          <Icon className="ms-1" icon={triggerIcon} />
        )}
        {triggerIcon === undefined && (
          <span {...api.getIndicatorProps()}>
            <Icon className="ms-1" icon="token-icon-menu-trigger" />
          </span>
        )}
      </Button>
    )
  }

  return (
    <>
      {/* Trigger */}
      {renderTrigger()}

      <Portal>
        <div className={positioner()} {...api.getPositionerProps()}>
          <ul className={content()} {...api.getContentProps()}>
            {items.map(renderMenuItem)}
          </ul>
        </div>
      </Portal>
    </>
  )
}

Menu.displayName = "Menu"
