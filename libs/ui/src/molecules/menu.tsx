/**
 * Menu — @techsio/ui-kit molecule.
 *
 * @component Menu
 * @componentVersion v1.3.4
 * @skill menu-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the menu-usage skill's component_version and a changelog entry. Bump all three together.
 */
import * as menu from "@zag-js/menu"
import { mergeProps, normalizeProps, useMachine } from "@zag-js/react"
import {
  cloneElement,
  type FocusEvent,
  isValidElement,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react"
import { tv, type VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { Icon, type IconType } from "../atoms/icon"
import { OverlayPortal as Portal } from "../internal/overlay-portal"

type ActionMenuItem = {
  type: "action"
  value: string
  label: string
  icon?: IconType
  disabled?: boolean
}

type LinkMenuItem = {
  type: "link"
  value: string
  label: string
  href: string
  target?: string
  rel?: string
  icon?: IconType
  disabled?: boolean
}

type RadioMenuItem = {
  type: "radio"
  value: string
  label: string
  name: string // radio group name
  checked: boolean
  disabled?: boolean
}

type CheckboxMenuItem = {
  type: "checkbox"
  value: string
  label: string
  checked: boolean
  disabled?: boolean
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
  | LinkMenuItem
  | RadioMenuItem
  | CheckboxMenuItem
  | SeparatorMenuItem
  | SubmenuMenuItem

// === COMPONENT VARIANTS ===
const menuVariants = tv({
  slots: {
    trigger: "",
    // Commands size independently of an icon trigger, within the viewport.
    positioner: ["popup-layer menu-viewport isolate"],
    content: [
      "popup-surface-base popup-layer",
      "w-full min-w-0",
      "duration-200 ease-out motion-safe:transition-[opacity,display,translate,scale]",
      "transition-discrete",
      "starting:scale-98 starting:opacity-0",
      "data-[state=open]:starting:scale-98 data-[state=open]:starting:opacity-0",
      "data-[state=open]:scale-100 data-[state=open]:opacity-100",
      "data-[state=closed]:scale-98 data-[state=closed]:opacity-0",
    ],
    item: [
      "popup-item-base",
      "not-data-disabled:hover:bg-popup-item-bg-hover",
      "not-data-disabled:focus:bg-popup-item-bg-hover",
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
    itemText: ["wrap-anywhere min-w-0 flex-grow whitespace-normal"],
    // Trailing, always rendered (empty when unchecked) so toggling a row
    // never reflows its label.
    // Same reasoning as optionItem: the glyph sits on the bare panel, not on
    // a filled selected row, so it follows the checked foreground.
    itemIndicator: [
      "absolute end-(--popup-item-x) top-1/2 -translate-y-1/2",
      "flex items-center justify-center",
      "size-(--size-popup-indicator) text-popup-item-fg-checked",
    ],
    itemIcon: ["shrink-0 text-menu-item-icon text-popup-item-fg-muted"],
    submenuIndicator: [
      "ms-menu-submenu-indicator text-menu-submenu-indicator-fg rtl:rotate-180",
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

// Zag moves focus into the content on the next animation frame after every
// navigation key. When Escape closes the menu inside that frame, WebKit still
// lets the late call focus the now-hidden content and then drops focus to
// <body>. Hand focus back to the element Zag had already restored it to.
function returnFocusFromClosedContent(event: FocusEvent<HTMLElement>) {
  const content = event.currentTarget
  const previous = event.relatedTarget
  if (
    content.hidden &&
    previous instanceof HTMLElement &&
    previous.isConnected &&
    !content.contains(previous)
  ) {
    previous.focus({ preventScroll: true })
  }
}

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
    if (menuItem.disabled) {
      return (
        <li
          {...api.getItemProps({ value: menuItem.value, disabled: true })}
          aria-disabled="true"
          className={itemSlot()}
          key={menuItem.value}
        >
          {menuItem.icon && (
            <Icon className={itemIcon()} icon={menuItem.icon} />
          )}
          <span className={itemText()}>{menuItem.label}</span>
          <Icon
            className={slots.submenuIndicator()}
            icon="token-icon-menu-submenu"
          />
        </li>
      )
    }
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
          disabled: menuItem.disabled,
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

  if (menuItem.type === "link") {
    return (
      <li key={menuItem.value} role="none">
        <a
          {...api.getItemProps({
            value: menuItem.value,
            valueText: menuItem.label,
            disabled: menuItem.disabled,
          })}
          className={itemSlot()}
          href={menuItem.disabled ? undefined : menuItem.href}
          rel={
            menuItem.rel ??
            (menuItem.target === "_blank" ? "noopener noreferrer" : undefined)
          }
          target={menuItem.target}
        >
          {menuItem.icon && (
            <Icon className={itemIcon()} icon={menuItem.icon} />
          )}
          <span className={itemText()}>{menuItem.label}</span>
        </a>
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
    dir: parentService.prop("dir"),
    loopFocus: parentService.prop("loopFocus"),
    typeahead: parentService.prop("typeahead"),
    navigate: parentService.prop("navigate"),
    positioning: { overlap: true, fitViewport: true },
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
        aria-disabled={item.disabled || undefined}
        data-disabled={item.disabled ? "" : undefined}
      >
        {item.icon && <Icon className={itemIcon()} icon={item.icon} />}
        <span className={itemText()}>{item.label}</span>
        <Icon className={submenuIndicator()} icon="token-icon-menu-submenu" />
      </li>

      <Portal>
        <div className={positioner()} {...submenuApi.getPositionerProps()}>
          <ul
            className={content()}
            {...mergeProps(submenuApi.getContentProps(), {
              onFocus: returnFocusFromClosedContent,
            })}
          >
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
    /** Open with right-click, long press or Shift+F10 instead of left-click. */
    contextMenu?: boolean
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
  contextMenu = false,
  className,
  size = "md",
  onCheckedChange,
}: MenuProps) {
  const generatedId = useId()
  const contextInvoker = useRef<HTMLElement | null>(null)
  const restoreContextFocus = useRef(false)
  const contextMenuWasOpen = useRef(false)

  useEffect(() => {
    if (!contextMenu) {
      return
    }
    const wasOpen = contextMenuWasOpen.current
    contextMenuWasOpen.current = api.open
    if (wasOpen && !api.open && restoreContextFocus.current) {
      contextInvoker.current?.focus({ preventScroll: true })
      restoreContextFocus.current = false
    }
  })

  const service = useMachine(menu.machine, {
    id: id || generatedId,
    dir,
    closeOnSelect,
    loopFocus,
    typeahead,
    positioning: { fitViewport: true, ...positioning },
    defaultHighlightedValue,
    highlightedValue,
    anchorPoint,
    open,
    defaultOpen,
    composite,
    navigate: navigate ? (details) => navigate(details.value) : undefined,
    onSelect(details) {
      restoreContextFocus.current = true
      onSelect?.(details)
    },
    onOpenChange,
    onEscapeKeyDown(event) {
      onEscapeKeyDown?.(event)
      if (!event.defaultPrevented) {
        restoreContextFocus.current = true
      }
    },
    onPointerDownOutside(event) {
      restoreContextFocus.current = false
      onPointerDownOutside?.(event)
    },
    onInteractOutside,
    onFocusOutside(event) {
      restoreContextFocus.current = false
      onFocusOutside?.(event)
    },
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

  const triggerProps = contextMenu
    ? mergeProps(api.getContextTriggerProps(), {
        "aria-haspopup": "menu",
        "aria-expanded": api.open,
        tabIndex: 0,
        onPointerDown(event: PointerEvent<HTMLElement>) {
          contextInvoker.current = event.currentTarget
          restoreContextFocus.current = true
        },
        onContextMenu(event: ReactMouseEvent<HTMLElement>) {
          contextInvoker.current = event.currentTarget
          restoreContextFocus.current = true
        },
        onKeyDown(event: KeyboardEvent<HTMLElement>) {
          if (
            event.key === "ContextMenu" ||
            (event.shiftKey && event.key === "F10")
          ) {
            event.preventDefault()
            const rect = event.currentTarget.getBoundingClientRect()
            event.currentTarget.dispatchEvent(
              new globalThis.MouseEvent("contextmenu", {
                bubbles: true,
                cancelable: true,
                clientX: rect.left,
                clientY: rect.bottom,
              })
            )
          }
        },
      })
    : api.getTriggerProps()
  const triggerClassName = trigger({ className })

  return (
    <>
      {isValidElement(customTrigger) ? (
        cloneElement(
          customTrigger as ReactElement<Record<string, unknown>>,
          mergeProps(
            customTrigger.props as Record<string, unknown>,
            triggerProps,
            { className: triggerClassName }
          )
        )
      ) : (
        <Button
          {...triggerProps}
          className={triggerClassName}
          size={size === "xs" ? "sm" : size}
        >
          {typeof customTrigger === "string" ||
          typeof customTrigger === "number"
            ? customTrigger
            : triggerText}
          <span {...api.getIndicatorProps()}>
            <Icon
              icon={triggerIcon ?? "token-icon-menu-trigger"}
              size="current"
            />
          </span>
        </Button>
      )}
      <Portal>
        <div className={positioner()} {...api.getPositionerProps()}>
          <ul
            className={content()}
            {...mergeProps(api.getContentProps(), {
              onFocus: returnFocusFromClosedContent,
            })}
          >
            {items.map((item) => renderMenuItem(item, itemContext))}
          </ul>
        </div>
      </Portal>
    </>
  )
}

Menu.displayName = "Menu"
