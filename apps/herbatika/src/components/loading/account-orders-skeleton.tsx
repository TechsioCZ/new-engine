"use client"

import { Skeleton } from "@techsio/ui-kit/atoms/skeleton"
import { AccountSurface } from "@/components/account/account-surface"

export function AccountOrdersSkeleton() {
  return (
    <AccountSurface className="space-y-500">
      <header className="space-y-200">
        <Skeleton.Rectangle className="h-7 w-32 rounded-full" />
        <Skeleton.Rectangle className="h-4 w-72 rounded-full" />
        <Skeleton.Rectangle className="h-4 w-40 rounded-full" />
      </header>

      <div className="space-y-300">
        {Array.from({ length: 2 }, (_, index) => (
          <article
            className="overflow-hidden rounded-order-group-lg border border-order-group-border bg-order-group-surface"
            key={`account-orders-skeleton-${index + 1}`}
          >
            <header className="space-y-250 border-order-group-border border-b bg-order-group-overlay p-order-group-3xl">
              <div className="flex flex-wrap items-center gap-200">
                <Skeleton.Rectangle className="h-5 w-28 rounded-full" />
                <Skeleton.Rectangle className="h-4 w-24 rounded-full" />
                <Skeleton.Rectangle className="h-6 w-20 rounded-full" />
              </div>

              <div className="flex flex-wrap items-start justify-between gap-250">
                <div className="space-y-150">
                  <Skeleton.Rectangle className="h-4 w-40 rounded-full" />
                  <Skeleton.Rectangle className="h-4 w-28 rounded-full" />
                </div>

                <div className="space-y-150">
                  <Skeleton.Rectangle className="h-4 w-20 rounded-full" />
                  <Skeleton.Rectangle className="h-5 w-24 rounded-full" />
                </div>
              </div>

              <div className="flex flex-wrap gap-200">
                <Skeleton.Rectangle className="h-9 w-36 rounded-full" />
                <Skeleton.Rectangle className="h-9 w-40 rounded-full" />
              </div>
            </header>

            <div className="hidden space-y-0 lg:block">
              <div className="grid grid-cols-[minmax(0,1fr)_max-content_max-content] gap-order-group-column px-order-group-3xl py-order-group-lg">
                <Skeleton.Rectangle className="h-4 w-16 rounded-full" />
                <Skeleton.Rectangle className="h-4 w-12 justify-self-start rounded-full" />
                <Skeleton.Rectangle className="h-4 w-12 justify-self-end rounded-full" />
              </div>

              {Array.from({ length: 2 }, (_, rowIndex) => (
                <div
                  className="grid grid-cols-[minmax(0,1fr)_max-content_max-content] items-start gap-order-group-column border-order-group-border border-t px-order-group-3xl py-order-group-3xl"
                  key={`account-orders-desktop-row-${index + 1}-${rowIndex + 1}`}
                >
                  <div className="flex items-center gap-order-group-lg">
                    <Skeleton.Rectangle className="size-8 shrink-0 rounded-sm" />
                    <div className="min-w-0 space-y-100">
                      <Skeleton.Rectangle className="h-4 w-64 rounded-full" />
                      <Skeleton.Rectangle className="h-4 w-32 rounded-full" />
                    </div>
                  </div>

                  <div className="space-y-100">
                    <Skeleton.Rectangle className="h-4 w-20 rounded-full" />
                    <Skeleton.Rectangle className="h-4 w-24 rounded-full" />
                  </div>

                  <Skeleton.Rectangle className="h-9 w-20 justify-self-end rounded-full" />
                </div>
              ))}
            </div>

            <div className="space-y-200 p-order-group-2xl lg:hidden">
              {Array.from({ length: 2 }, (_, rowIndex) => (
                <article
                  className="space-y-200 rounded-order-group-md border border-order-group-border bg-order-group-overlay p-order-group-xl"
                  key={`account-orders-mobile-row-${index + 1}-${rowIndex + 1}`}
                >
                  <div className="flex items-start gap-order-group-lg">
                    <Skeleton.Rectangle className="size-8 shrink-0 rounded-sm" />
                    <div className="min-w-0 flex-1 space-y-100">
                      <Skeleton.Rectangle className="h-4 w-full rounded-full" />
                      <Skeleton.Rectangle className="h-4 w-32 rounded-full" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-200">
                    <Skeleton.Rectangle className="h-4 w-24 rounded-full" />
                    <Skeleton.Rectangle className="h-5 w-20 rounded-full" />
                  </div>
                </article>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="flex justify-start">
        <Skeleton.Rectangle className="h-9 w-48 rounded-full" />
      </div>
    </AccountSurface>
  )
}
