/**
 * Header — @techsio/ui-kit organism.
 *
 * @component Header
 * @componentVersion v1.0.0
 * @skill header-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 *
 * Versioning is enforced at commit by scripts/check-skill-sync.mjs: @componentVersion must match
 * the header-usage skill's component_version and a changelog entry. Bump all three together.
 */
import type { HTMLAttributes, ReactNode, Ref } from "react"
import { createContext, useContext, useState } from "react"
import type { VariantProps } from "tailwind-variants"

import { Button } from "../atoms/button"
import { tv } from "../utils"

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
      "transition-colors duration-200 motion-reduce:transition-none",
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
      "transition-colors duration-200 motion-reduce:transition-none",
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
      "transition-colors duration-200 motion-reduce:transition-none",
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

// === CONTEXT ===
interface HeaderContextValue {
  size?: "sm" | "md" | "lg" | undefined
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  toggleMobileMenu: () => void
}

export const HeaderContext = createContext<HeaderContextValue>({
  isMobileMenuOpen: false,
  setIsMobileMenuOpen: () => {},
  toggleMobileMenu: () => {},
})

// === TYPE DEFINITIONS ===
export interface HeaderProps
  extends HTMLAttributes<HTMLElement>, VariantProps<typeof headerVariants> {
  children: ReactNode
  ref?: Ref<HTMLElement> | undefined
}

interface HeaderContainerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  ref?: Ref<HTMLElement> | undefined
  position?: "start" | "center" | "end" | undefined
}

interface HeaderNavProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  ref?: Ref<HTMLElement> | undefined
  size?: "sm" | "md" | "lg" | undefined
}

interface HeaderNavItemProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean | undefined
  children: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
  size?: "sm" | "md" | "lg" | undefined
}

interface HeaderActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
  size?: "sm" | "md" | "lg" | undefined
}

interface HeaderActionItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
  size?: "sm" | "md" | "lg" | undefined
}

interface HeaderMobileProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement> | undefined
  position?: "left" | "right" | undefined
}

export function Header({
  size = "md",
  direction = "horizontal",
  className,
  children,
  ref,
  ...props
}: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev)
  }
  const { root } = headerVariants({
    direction,
    size,
  })

  return (
    <HeaderContext.Provider
      value={{
        isMobileMenuOpen,
        setIsMobileMenuOpen,
        size,
        toggleMobileMenu,
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
  ...props
}: HeaderMobileProps) {
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
}: {
  className?: string | undefined
}) {
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
