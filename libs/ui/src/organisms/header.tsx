/**
 * Header — @techsio/ui-kit organism.
 *
 * @component Header
 * @componentVersion v1.2.1
 * @skill header-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the header-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type {
  ComponentProps,
  HTMLAttributes,
  ReactNode,
  Ref,
  RefObject,
} from "react"
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react"
import type { VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { tv } from "../utils"

const headerVariants = tv({
  slots: {
    root: [
      "@container w-full min-w-0 bg-header-bg",
      "flex justify-between",
      "max-w-header-max",
      "relative",
    ],
    desktop: "header-desktop w-full min-w-0",
    mobile: [
      "header-mobile absolute inset-x-0 top-full z-20 w-full min-w-0 bg-header-bg *:flex *:flex-col data-[position=right]:right-0 data-[position=left]:left-0 data-[open=false]:hidden",
    ],
    container: [
      "grid w-full min-w-0 gap-header-container",
      "data-[position=start]:justify-items-start-safe",
      "data-[position=center]:justify-items-center-safe",
      "data-[position=end]:justify-items-end-safe",
    ],
    nav: ["flex flex-1 items-center", "bg-header-bg"],
    navItem: [
      "bg-header-nav-item-bg hover:bg-header-nav-item-bg-hover",
      "data-[active=true]:text-header-nav-fg-active",
      "data-[active=true]:font-header-nav-active",
      "min-w-max",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    actions: ["flex items-center", "shrink-0"],
    actionItem: [
      "text-header-actions-fg",
      "hover:text-header-actions-fg-hover",
      "transition-colors duration-200 motion-reduce:transition-none",
    ],
    hamburger: [
      "header-hamburger ms-auto shrink-0",
      "items-center",
      "text-header-hamburger-fg hover:text-header-hamburger-fg-hover",
      "transition-colors duration-header motion-reduce:transition-none",
      "cursor-pointer",
    ],
  },
  compoundSlots: [
    {
      slots: ["navItem"],
      class: [
        "justify-start font-header-nav text-header-nav-fg hover:text-header-nav-fg-hover",
        "cursor-pointer",
      ],
    },
  ],
  variants: {
    direction: {
      vertical: {
        root: ["flex-col"],
      },
      horizontal: {
        root: ["flex-row"],
      },
    },
    size: {
      sm: {
        nav: "gap-header-nav-sm",
        navItem: "p-header-item-sm text-header-item-sm",
        actions: "gap-header-actions-sm",
        actionItem: "p-header-item-sm text-header-item-sm",
        hamburger:
          "h-form-control-sm p-header-hamburger-sm text-header-hamburger-sm",
      },
      md: {
        nav: "gap-header-nav-md",
        navItem: "p-header-item-md text-header-item-md",
        actions: "gap-header-actions-md",
        actionItem: "p-header-item-md text-header-item-md",
        hamburger:
          "h-form-control-md p-header-hamburger-md text-header-hamburger-md",
      },
      lg: {
        nav: "gap-header-nav-lg",
        navItem: "p-header-item-lg text-header-item-lg",
        actions: "gap-header-actions-lg",
        actionItem: "p-header-item-lg text-header-item-lg",
        hamburger:
          "h-form-control-lg p-header-hamburger-lg text-header-hamburger-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
    direction: "horizontal",
  },
})

// === CONTEXT ===
type HeaderContextValue = {
  size?: "sm" | "md" | "lg"
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void
  mobileMenuId: string
  setMobileMenuId: (id: string) => void
  hamburgerRef?: RefObject<HTMLButtonElement | null>
}

export const HeaderContext = createContext<HeaderContextValue>({
  mobileMenuId: "",
  setMobileMenuId: () => undefined,
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => undefined,
  toggleMobileMenu: () => undefined,
})

// === TYPE DEFINITIONS ===
export type HeaderProps = HTMLAttributes<HTMLElement> &
  VariantProps<typeof headerVariants> & {
    children: ReactNode
    ref?: Ref<HTMLElement>
  }

type HeaderContainerProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  ref?: Ref<HTMLElement>
  position?: "start" | "center" | "end"
}

type HeaderNavProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode
  ref?: Ref<HTMLElement>
  size?: "sm" | "md" | "lg"
}

type HeaderNavItemProps = HTMLAttributes<HTMLDivElement> & {
  active?: boolean
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  size?: "sm" | "md" | "lg"
}

type HeaderActionsProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  size?: "sm" | "md" | "lg"
}

type HeaderActionItemProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  size?: "sm" | "md" | "lg"
}

type HeaderMobileProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  position?: "left" | "right"
}

export function Header({
  size = "md",
  direction = "horizontal",
  className,
  children,
  ref,
  ...props
}: HeaderProps) {
  const generatedMenuId = useId()
  const [mobileMenuId, setMobileMenuId] = useState(
    `${generatedMenuId}-mobile-menu`
  )
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev)
  useEffect(() => {
    if (!isMobileMenuOpen) {
      return
    }
    const ownerDocument = hamburgerRef.current?.ownerDocument
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) {
        return
      }
      event.preventDefault()
      setIsMobileMenuOpen(false)
      hamburgerRef.current?.focus()
    }
    ownerDocument?.addEventListener("keydown", handleEscape)
    return () => ownerDocument?.removeEventListener("keydown", handleEscape)
  }, [isMobileMenuOpen])
  useEffect(() => {
    const trigger = hamburgerRef.current
    const header = trigger?.closest("header")
    if (!(trigger && header)) {
      return
    }
    let focusWasInMobile = false
    const rememberFocus = (event: FocusEvent) => {
      const panel = trigger.ownerDocument.getElementById(mobileMenuId)
      focusWasInMobile =
        event.target === trigger ||
        (event.target instanceof Node && !!panel?.contains(event.target))
    }
    const reconcile = () => {
      if (getComputedStyle(trigger).display !== "none") {
        return
      }
      setIsMobileMenuOpen(false)
      if (focusWasInMobile) {
        header
          .querySelector<HTMLElement>(
            ".header-desktop a[href], .header-desktop button:not([disabled])"
          )
          ?.focus()
        focusWasInMobile = false
      }
    }
    const view = trigger.ownerDocument.defaultView
    trigger.ownerDocument.addEventListener("focusin", rememberFocus)
    // Test DOMs and older embeds may lack ResizeObserver; viewport resizes
    // still cover breakpoint changes there.
    const Observer = view?.ResizeObserver
    const observer = Observer ? new Observer(reconcile) : undefined
    observer?.observe(header)
    if (!observer) {
      view?.addEventListener("resize", reconcile)
    }
    reconcile()
    return () => {
      observer?.disconnect()
      view?.removeEventListener("resize", reconcile)
      trigger.ownerDocument.removeEventListener("focusin", rememberFocus)
    }
  }, [mobileMenuId])
  const { root } = headerVariants({
    size,
    direction,
  })

  return (
    <HeaderContext.Provider
      value={{
        size,
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        toggleMobileMenu,
        mobileMenuId,
        setMobileMenuId,
        hamburgerRef,
      }}
    >
      <header
        className={root({
          className,
        })}
        ref={ref}
        {...props}
      >
        {children}
      </header>
    </HeaderContext.Provider>
  )
}

Header.Desktop = function HeaderDesktop({
  className,
  children,
  ref,
  ...props
}: HeaderContainerProps) {
  const { desktop } = headerVariants()
  return (
    <section className={desktop({ className })} ref={ref} {...props}>
      {children}
    </section>
  )
}

Header.Mobile = function HeaderMobile({
  className,
  children,
  ref,
  position = "right",
  id,
  ...props
}: HeaderMobileProps) {
  const { isMobileMenuOpen, mobileMenuId, setMobileMenuId } =
    useContext(HeaderContext)
  useEffect(() => {
    if (id) {
      setMobileMenuId(id)
    }
  }, [id, setMobileMenuId])
  const { mobile } = headerVariants()
  return (
    <section
      className={mobile({ className })}
      data-open={isMobileMenuOpen}
      data-position={position}
      ref={ref}
      {...props}
      id={mobileMenuId}
    >
      {children}
    </section>
  )
}

Header.Container = function HeaderContainer({
  className,
  children,
  ref,
  position,
  ...props
}: HeaderContainerProps) {
  const { container } = headerVariants()
  return (
    <section
      className={container({ className })}
      data-position={position}
      ref={ref}
      {...props}
    >
      {children}
    </section>
  )
}

Header.Nav = function HeaderNav({
  className,
  children,
  ref,
  size: overrideSize,
  ...props
}: HeaderNavProps) {
  const { size: contextSize } = useContext(HeaderContext)
  const size = overrideSize ?? contextSize ?? "md"
  const { nav } = headerVariants({ size })

  return (
    <nav className={nav({ className })} ref={ref} {...props}>
      {children}
    </nav>
  )
}

Header.NavItem = function HeaderNavItem({
  active = false,
  className,
  children,
  ref,
  size: overrideSize,
  ...props
}: HeaderNavItemProps) {
  const context = useContext(HeaderContext)
  const size = overrideSize ?? context.size ?? "md"
  const { navItem } = headerVariants({ size })

  return (
    <div
      className={navItem({ className })}
      data-active={active || undefined}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
}

Header.Actions = function HeaderActions({
  className,
  children,
  ref,
  size: overrideSize,
  ...props
}: HeaderActionsProps) {
  const context = useContext(HeaderContext)
  const size = overrideSize ?? context.size ?? "md"
  const { actions } = headerVariants({ size })

  return (
    <div className={actions({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

Header.ActionItem = function HeaderActionItem({
  className,
  children,
  ref,
  size: overrideSize,
  ...props
}: HeaderActionItemProps) {
  const context = useContext(HeaderContext)
  const size = overrideSize ?? context.size ?? "md"
  const { actionItem } = headerVariants({ size })

  return (
    <div className={actionItem({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

Header.Hamburger = function HeaderHamburger({
  className,
  ref,
  onClick,
  "aria-label": ariaLabel = "Toggle mobile menu",
  ...props
}: ComponentProps<typeof Button>) {
  const {
    toggleMobileMenu,
    isMobileMenuOpen,
    mobileMenuId,
    hamburgerRef,
    size,
  } = useContext(HeaderContext)
  const { hamburger } = headerVariants({ size })

  return (
    <Button
      aria-controls={mobileMenuId}
      aria-expanded={isMobileMenuOpen}
      {...props}
      aria-label={ariaLabel}
      className={hamburger({ className })}
      icon={
        isMobileMenuOpen ? "token-icon-header-close" : "token-icon-header-menu"
      }
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) {
          toggleMobileMenu()
        }
      }}
      ref={(node) => {
        if (hamburgerRef) {
          hamburgerRef.current = node
        }
        if (typeof ref === "function") {
          return ref(node)
        }
        if (ref) {
          ref.current = node
        }
      }}
      size="current"
      theme="unstyled"
      type="button"
    />
  )
}
