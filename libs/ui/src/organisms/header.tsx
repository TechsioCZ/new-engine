import type { HTMLAttributes, ReactNode, Ref } from "react"
import { createContext, useContext, useState } from "react"
import type { VariantProps } from "tailwind-variants"
import { Button } from "../atoms/button"
import { tv } from "../utils"

const headerVariants = tv({
  slots: {
    root: [
      "@container w-full bg-header-bg",
      "flex justify-between",
      "max-w-header-max",
      "relative",
    ],
    desktop: "flex @max-header-desktop:hidden w-full",
    mobile: [
      "absolute top-full @header-desktop:hidden *:flex *:flex-col data-[position=right]:right-0 data-[position=left]:left-0 data-[open=false]:hidden",
    ],
    container: [
      "grid w-full gap-header-container",
      "data-[position=start]:justify-items-start-safe",
      "data-[position=center]:justify-items-center-safe",
      "data-[position=end]:justify-items-end-safe",
    ],
    nav: ["flex flex-1 items-center", "@max-header-desktop:bg-header-bg"],
    navItem: [
      'bg-header-nav-item-bg hover:bg-header-nav-item-bg-hover',
      'data-[active=true]:text-header-nav-fg-active',
      'data-[active=true]:font-header-nav-active',
      'min-w-max',
      'transition-colors duration-200 motion-reduce:transition-none',
    ],
    actions: ["flex items-center", "shrink-0"],
    actionItem: [
      'text-header-actions-fg',
      'hover:text-header-actions-fg-hover',
      'transition-colors duration-200 motion-reduce:transition-none',
    ],
    hamburger: [
      '@header-desktop:hidden',
      'items-center',
      'text-header-hamburger-fg hover:text-header-hamburger-fg-hover',
      'transition-colors duration-header motion-reduce:transition-none',
      'cursor-pointer',
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
        hamburger: "p-header-hamburger-sm text-header-hamburger-sm",
      },
      md: {
        nav: "gap-header-nav-md",
        navItem: "p-header-item-md text-header-item-md",
        actions: "gap-header-actions-md",
        actionItem: "p-header-item-md text-header-item-md",
        hamburger: "p-header-hamburger-md text-header-hamburger-md",
      },
      lg: {
        nav: "gap-header-nav-lg",
        navItem: "p-header-item-lg text-header-item-lg",
        actions: "gap-header-actions-lg",
        actionItem: "p-header-item-lg text-header-item-lg",
        hamburger: "p-header-hamburger-lg text-header-hamburger-lg",
      },
    },
  },
  defaultVariants: {
    size: "md",
    direction: "horizontal",
  },
})

// === CONTEXT ===
interface HeaderContextValue {
  size?: "sm" | "md" | "lg"
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
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof headerVariants> {
  children: ReactNode
  ref?: Ref<HTMLElement>
}

interface HeaderContainerProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  ref?: Ref<HTMLElement>
  position?: "start" | "center" | "end"
}

interface HeaderNavProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode
  ref?: Ref<HTMLElement>
  size?: "sm" | "md" | "lg"
}

interface HeaderNavItemProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  size?: "sm" | "md" | "lg"
}

interface HeaderActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  size?: "sm" | "md" | "lg"
}

interface HeaderActionItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  ref?: Ref<HTMLDivElement>
  size?: "sm" | "md" | "lg"
}

interface HeaderMobileProps extends HTMLAttributes<HTMLDivElement> {
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const toggleMobileMenu = () => setIsMobileMenuOpen((prev) => !prev)
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
  className?: string
}) {
  const { toggleMobileMenu, isMobileMenuOpen } = useContext(HeaderContext)
  const { hamburger } = headerVariants()

  return (
    <Button
      aria-expanded={isMobileMenuOpen}
      aria-label="Toggle mobile menu"
      className={hamburger({ className })}
      icon={isMobileMenuOpen ? "token-icon-header-close" : "token-icon-header-menu"}
      onClick={toggleMobileMenu}
      size="current"
      theme="unstyled"
      type="button"
    />
  )
}
