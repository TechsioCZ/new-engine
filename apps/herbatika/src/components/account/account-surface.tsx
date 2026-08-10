import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import type { ReactNode } from "react"

interface AccountSurfaceProps {
  children: ReactNode
  className?: string
}

const ACCOUNT_SURFACE_CLASSNAME =
  "rounded-lg border border-border-secondary bg-surface p-550"

export const AccountSurface = ({
  children,
  className,
}: AccountSurfaceProps) => (
  <section
    className={
      className !== undefined && className.length > 0
        ? `${ACCOUNT_SURFACE_CLASSNAME} ${className}`
        : ACCOUNT_SURFACE_CLASSNAME
    }
  >
    {children}
  </section>
)

interface AccountSkeletonSurfaceProps {
  lines?: number
}

export const AccountSkeletonSurface = ({
  lines = 6,
}: AccountSkeletonSurfaceProps) => (
  <AccountSurface>
    <Skeleton>
      <Skeleton.Text noOfLines={lines} />
    </Skeleton>
  </AccountSurface>
)
