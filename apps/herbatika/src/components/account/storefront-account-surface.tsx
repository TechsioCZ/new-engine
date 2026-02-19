import { Skeleton } from "@techsio/ui-kit/atoms/skeleton";
import type { ReactNode } from "react";

type StorefrontAccountSurfaceProps = {
  children: ReactNode;
  className?: string;
};

const ACCOUNT_SURFACE_CLASSNAME =
  "rounded-xl border border-border-secondary bg-surface p-550";

export function StorefrontAccountSurface({
  children,
  className,
}: StorefrontAccountSurfaceProps) {
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

type StorefrontAccountSkeletonSurfaceProps = {
  lines?: number;
};

export function StorefrontAccountSkeletonSurface({
  lines = 6,
}: StorefrontAccountSkeletonSurfaceProps) {
  return (
    <StorefrontAccountSurface>
      <Skeleton>
        <Skeleton.Text noOfLines={lines} />
      </Skeleton>
    </StorefrontAccountSurface>
  );
}
