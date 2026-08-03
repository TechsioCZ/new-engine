"use client"

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"

import { AccountSurface } from "@/components/account/account-surface"

export function AccountOrdersSkeleton() {
  return (
    <AccountSurface className="space-y-500">
      <header className="space-y-200">
        <Skeleton.Rectangle className="h-skeleton-heading w-skeleton-heading rounded-full" />
        <Skeleton.Rectangle className="h-skeleton-line w-skeleton-copy-wide rounded-full" />
        <Skeleton.Rectangle className="h-skeleton-line w-skeleton-title-lg rounded-full" />
      </header>

      <div className="space-y-300">
        {Array.from({ length: 2 }, (_orderItem, orderIndex) => (
          <article
            className="overflow-hidden rounded-order-group-lg border border-order-group-border bg-order-group-surface"
            key={`account-orders-skeleton-${orderIndex + 1}`}
          >
            <header className="space-y-250 border-order-group-border border-b bg-order-group-overlay p-order-group-3xl">
              <div className="flex flex-wrap items-center gap-200">
                <Skeleton.Rectangle className="h-skeleton-line-lg w-skeleton-caption rounded-full" />
                <Skeleton.Rectangle className="h-skeleton-line w-skeleton-control rounded-full" />
                <Skeleton.Rectangle className="h-skeleton-control w-skeleton-short rounded-full" />
              </div>

              <div className="flex flex-wrap items-start justify-between gap-250">
                <div className="space-y-150">
                  <Skeleton.Rectangle className="h-skeleton-line w-skeleton-title-lg rounded-full" />
                  <Skeleton.Rectangle className="h-skeleton-line w-skeleton-caption rounded-full" />
                </div>

                <div className="space-y-150">
                  <Skeleton.Rectangle className="h-skeleton-line w-skeleton-short rounded-full" />
                  <Skeleton.Rectangle className="h-skeleton-line-lg w-skeleton-control rounded-full" />
                </div>
              </div>

              <div className="flex flex-wrap gap-200">
                <Skeleton.Rectangle className="h-skeleton-action w-skeleton-action rounded-full" />
                <Skeleton.Rectangle className="h-skeleton-action w-skeleton-title-lg rounded-full" />
              </div>
            </header>

            <div className="hidden space-y-0 lg:block">
              <div className="grid account-order-table-layout gap-order-group-column px-order-group-3xl py-order-group-lg">
                <Skeleton.Rectangle className="h-skeleton-line w-skeleton-compact rounded-full" />
                <Skeleton.Rectangle className="h-skeleton-line w-skeleton-label justify-self-start rounded-full" />
                <Skeleton.Rectangle className="h-skeleton-line w-skeleton-label justify-self-end rounded-full" />
              </div>

              {Array.from({ length: 2 }, (_desktopRow, desktopRowIndex) => (
                <div
                  className="grid account-order-table-layout items-start gap-order-group-column border-order-group-border border-t px-order-group-3xl py-order-group-3xl"
                  key={`account-orders-desktop-row-${orderIndex + 1}-${desktopRowIndex + 1}`}
                >
                  <div className="flex items-center gap-order-group-lg">
                    <Skeleton.Rectangle className="size-8 shrink-0 rounded-sm" />
                    <div className="min-w-0 space-y-100">
                      <Skeleton.Rectangle className="h-skeleton-line w-skeleton-copy rounded-full" />
                      <Skeleton.Rectangle className="h-skeleton-line w-skeleton-heading rounded-full" />
                    </div>
                  </div>

                  <div className="space-y-100">
                    <Skeleton.Rectangle className="h-skeleton-line w-skeleton-short rounded-full" />
                    <Skeleton.Rectangle className="h-skeleton-line w-skeleton-control rounded-full" />
                  </div>

                  <Skeleton.Rectangle className="h-skeleton-action w-skeleton-short justify-self-end rounded-full" />
                </div>
              ))}
            </div>

            <div className="space-y-200 p-order-group-2xl lg:hidden">
              {Array.from({ length: 2 }, (_mobileRow, mobileRowIndex) => (
                <article
                  className="space-y-200 rounded-order-group-md border border-order-group-border bg-order-group-overlay p-order-group-xl"
                  key={`account-orders-mobile-row-${orderIndex + 1}-${mobileRowIndex + 1}`}
                >
                  <div className="flex items-start gap-order-group-lg">
                    <Skeleton.Rectangle className="size-8 shrink-0 rounded-sm" />
                    <div className="min-w-0 flex-1 space-y-100">
                      <Skeleton.Rectangle className="h-skeleton-line w-full rounded-full" />
                      <Skeleton.Rectangle className="h-skeleton-line w-skeleton-heading rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-200">
                    <Skeleton.Rectangle className="h-skeleton-line w-skeleton-control rounded-full" />
                    <Skeleton.Rectangle className="h-skeleton-line-lg w-skeleton-short rounded-full" />
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="flex justify-start">
        <Skeleton.Rectangle className="h-skeleton-action w-skeleton-title-xl rounded-full" />
      </div>
    </AccountSurface>
  )
}
