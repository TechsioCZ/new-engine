import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import type { ReactNode } from "react";

type AccountSurfaceProps = {
  children: ReactNode;
  className?: string;
};

const ACCOUNT_SURFACE_CLASSNAME =
  "rounded-lg border border-border-secondary bg-surface p-550";

export function AccountSurface({ children, className }: AccountSurfaceProps) {
  return (
    <section
      className={
        className
          ? `${ACCOUNT_SURFACE_CLASSNAME} ${className}`
          : ACCOUNT_SURFACE_CLASSNAME
      }
    >
      {children}
    </section>
  );
}

type AccountSkeletonSurfaceProps = {
  lines?: number;
};

export function AccountSkeletonSurface({
  lines = 6,
}: AccountSkeletonSurfaceProps) {
  return (
    <AccountSurface>
      <Skeleton>
        <Skeleton.Text noOfLines={lines} />
      </Skeleton>
    </AccountSurface>
  );
}
