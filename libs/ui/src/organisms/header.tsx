/*
 * Header — @techsio/ui-kit organism.
 *
 * @component Header
 * @componentVersion v1.0.1
 * @skill header-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the header-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import { useContext, useState } from "react"
import type { VariantProps } from "tailwind-variants"

import { Button } from "../atoms/button"
import { tv } from "../utils"
import { HeaderContext } from "./header-context"
import type { HeaderContextValue, HeaderSize } from "./header-context"

export { HeaderContext } from "./header-context"

// Shared by the action item, hamburger and nav item slots so the class string has one owner.
const TRANSITION_COLORS =
  "transition-colors duration-200 motion-reduce:transition-none"

const headerVariants = tv({
  compoundSlots: [
    {
      class: [
        "justify-start font-header-nav text-header-nav-fg hover:text-header-nav-fg-hover",
        "cursor-pointer",
      ],
      slots: ["navItem"],
    },
  ],
  defaultVariants: {
    direction: "horizontal",
    size: "md",
  },
  slots: {
    actionItem: [
      "text-header-actions-fg",
      "hover:text-header-actions-fg-hover",
      TRANSITION_COLORS,
    ],
    actions: ["flex items-center", "shrink-0"],
    container: [
      "grid w-full gap-header-container",
      "data-[position=start]:justify-items-start",
      "data-[position=center]:justify-items-center-safe",
      "data-[position=end]:justify-items-end-safe",
    ],
    desktop: "flex @max-header-desktop:hidden w-full",
    hamburger: [
      "@header-desktop:hidden",
      "items-center",
      "text-header-hamburger-fg hover:text-header-hamburger-fg-hover",
      TRANSITION_COLORS,
      "cursor-pointer",
    ],
    mobile: [
      "absolute top-full @header-desktop:hidden *:flex *:flex-col data-[position=right]:right-0 data-[position=left]:left-0 data-[open=false]:hidden",
    ],
    nav: ["flex flex-1 items-center", "@max-header-desktop:bg-header-bg"],
    navItem: [
      "bg-header-nav-item-bg hover:bg-header-nav-item-bg-hover",
      "data-[active=true]:text-header-nav-fg-active",
      "data-[active=true]:font-header-nav-active",
      "min-w-max",
      TRANSITION_COLORS,
    ],
    root: [
      "@container w-full bg-header-bg",
      "flex justify-between",
      "relative",
    ],
  },
  variants: {
    direction: {
      horizontal: {
        root: ["flex-row"],
      },
      vertical: {
        root: ["flex-col"],
      },
    },
    size: {
      lg: {
        actionItem: "p-header-item-lg text-header-item-lg",
        actions: "gap-header-actions-lg",
        hamburger: "p-header-hamburger-lg text-header-hamburger-lg",
        nav: "gap-header-nav-lg",
        navItem: "p-header-item-lg text-header-item-lg",
      },
      md: {
        actionItem: "p-header-item-md text-header-item-md",
        actions: "gap-header-actions-md",
        hamburger: "p-header-hamburger-md text-header-hamburger-md",
        nav: "gap-header-nav-md",
        navItem: "p-header-item-md text-header-item-md",
      },
      sm: {
        actionItem: "p-header-item-sm text-header-item-sm",
        actions: "gap-header-actions-sm",
        hamburger: "p-header-hamburger-sm text-header-hamburger-sm",
        nav: "gap-header-nav-sm",
        navItem: "p-header-item-sm text-header-item-sm",
      },
    },
  },
})

// === SHARED UNIONS ===
type HeaderContainerPosition = "start" | "center" | "end"

// === TYPE DEFINITIONS ===
export interface HeaderProps
  extends HTMLAttributes<HTMLElement>, VariantProps<typeof headerVariants> {
  children: ReactNode
  ref?: Ref<HTMLElement> | undefined
}

interface HeaderContainerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  ref?: Ref<HTMLElement> | undefined
  position?: HeaderContainerPosition | undefined
}

interface HeaderNavProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  ref?: Ref<HTMLElement> | undefined
  size?: HeaderSize | undefined
}

interface HeaderNavItemProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean | undefined
  children: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
  size?: HeaderSize | undefined
}

interface HeaderActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
  size?: HeaderSize | undefined
}

interface HeaderActionItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
  size?: HeaderSize | undefined
}

interface HeaderMobileProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
  position?: "left" | "right" | undefined
}

// Owns the mobile-menu state and assembles the value handed to `HeaderContext`. Extracted so the
// provider is given an already-built value instead of an object literal constructed at the JSX
// site; React Compiler caches the result, so no manual `useMemo` is involved.
const useHeaderContextValue = (size: HeaderSize): HeaderContextValue => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }

  return {
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    size,
    toggleMobileMenu,
  }
}

export const Header = ({
  size = "md",
  direction = "horizontal",
  className,
  children,
  ref,
  ...props
}: HeaderProps) => {
  const contextValue = useHeaderContextValue(size)
  const { root } = headerVariants({
    direction,
    size,
  })

  return (
    <HeaderContext.Provider value={contextValue}>
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

const HeaderDesktop = ({
  className,
  children,
  ref,
  ...props
}: HeaderContainerProps) => {
  const { desktop } = headerVariants()
  return (
    <section className={desktop({ className })} ref={ref} {...props}>
      {children}
    </section>
  )
}

const HeaderMobile = ({
  className,
  children,
  ref,
  position = "right",
  ...props
}: HeaderMobileProps) => {
  const { isMobileMenuOpen } = useContext(HeaderContext)
  const { mobile } = headerVariants()
  return (
    <section
      className={mobile({ className })}
      data-open={isMobileMenuOpen}
      data-position={position}
      ref={ref}
      {...props}
    >
      {children}
    </section>
  )
}

const HeaderContainer = ({
  className,
  children,
  ref,
  position,
  ...props
}: HeaderContainerProps) => {
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

const HeaderNav = ({
  className,
  children,
  ref,
  size: overrideSize,
  ...props
}: HeaderNavProps) => {
  const { size: contextSize } = useContext(HeaderContext)
  const size = overrideSize ?? contextSize ?? "md"
  const { nav } = headerVariants({ size })

  return (
    <nav className={nav({ className })} ref={ref} {...props}>
      {children}
    </nav>
  )
}

const HeaderNavItem = ({
  active = false,
  className,
  children,
  ref,
  size: overrideSize,
  ...props
}: HeaderNavItemProps) => {
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

const HeaderActions = ({
  className,
  children,
  ref,
  size: overrideSize,
  ...props
}: HeaderActionsProps) => {
  const context = useContext(HeaderContext)
  const size = overrideSize ?? context.size ?? "md"
  const { actions } = headerVariants({ size })

  return (
    <div className={actions({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

const HeaderActionItem = ({
  className,
  children,
  ref,
  size: overrideSize,
  ...props
}: HeaderActionItemProps) => {
  const context = useContext(HeaderContext)
  const size = overrideSize ?? context.size ?? "md"
  const { actionItem } = headerVariants({ size })

  return (
    <div className={actionItem({ className })} ref={ref} {...props}>
      {children}
    </div>
  )
}

const HeaderHamburger = ({ className }: { className?: string | undefined }) => {
  const { toggleMobileMenu, isMobileMenuOpen } = useContext(HeaderContext)
  const { hamburger } = headerVariants()

  return (
    <Button
      aria-expanded={isMobileMenuOpen}
      aria-label="Toggle mobile menu"
      className={hamburger({ className })}
      icon={
        isMobileMenuOpen ? "token-icon-header-close" : "token-icon-header-menu"
      }
      onClick={toggleMobileMenu}
      size="current"
      theme="unstyled"
      type="button"
    />
  )
}

Header.Desktop = HeaderDesktop
Header.Mobile = HeaderMobile
Header.Container = HeaderContainer
Header.Nav = HeaderNav
Header.NavItem = HeaderNavItem
Header.Actions = HeaderActions
Header.ActionItem = HeaderActionItem
Header.Hamburger = HeaderHamburger
