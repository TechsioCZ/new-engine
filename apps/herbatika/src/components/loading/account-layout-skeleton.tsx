"use client"

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import type { ReactNode } from "react"
import { AccountSkeletonSurface } from "@/components/account/account-surface"

type AccountLayoutSkeletonProps = {
  surface?: ReactNode
  surfaceLines?: number
}

export function AccountLayoutSkeleton({
  surface,
  surfaceLines = 8,
}: AccountLayoutSkeletonProps) {
  return (
    <main className="mx-auto w-full max-w-max-w p-account-page 2xl:p-account-page-lg">
      <div className="grid gap-account-page-gap lg:grid-cols-[17rem_minmax(0,1fr)] lg:items-start">
        <aside className="space-y-400 rounded-lg border border-border-secondary bg-surface p-400">
          <div className="space-y-150">
            <Skeleton.Text noOfLines={2} size="sm" />
          </div>

          <div className="space-y-200">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton.Rectangle
                className="h-650 rounded-md"
                key={`account-nav-skeleton-${index + 1}`}
              />
            ))}
          </div>

          <div className="h-px rounded-full bg-border-secondary" />

          <Skeleton.Rectangle className="h-650 rounded-md" />
        </aside>

        {surface ?? <AccountSkeletonSurface lines={surfaceLines} />}
      </div>
    </main>
  )
}
