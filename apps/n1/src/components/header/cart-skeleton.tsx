const CART_SKELETON_KEYS = [
  "cart-skeleton-0",
  "cart-skeleton-1",
  "cart-skeleton-2",
]

export const CartSkeleton = () => {
  return (
    <div className="flex flex-col gap-300">
      {/* Cart items skeleton */}
      <div className="space-y-300">
        {CART_SKELETON_KEYS.map((key) => (
          <div className="flex animate-pulse gap-300" key={key}>
            {/* Thumbnail skeleton */}
            <div className="h-cart-thumbnail w-cart-thumbnail rounded-md bg-overlay-light" />

            {/* Content skeleton */}
            <div className="flex-1 space-y-200">
              <div className="h-400 w-3/4 rounded bg-overlay-light" />
              <div className="h-300 w-1/2 rounded bg-overlay-light" />
              <div className="h-400 w-skeleton-line-wide rounded bg-overlay-light" />
            </div>

            {/* Controls skeleton */}
            <div className="flex items-center gap-200">
              <div className="h-650 w-650 rounded bg-overlay-light" />
              <div className="h-650 w-650 rounded bg-overlay-light" />
              <div className="h-650 w-650 rounded bg-overlay-light" />
            </div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-overlay-light" />

      {/* Totals skeleton */}
      <div className="space-y-200">
        <div className="flex justify-between">
          <div className="h-400 w-skeleton-line-wide rounded bg-overlay-light" />
          <div className="h-400 w-cart-thumbnail rounded bg-overlay-light" />
        </div>
        <div className="flex justify-between">
          <div className="h-500 w-cart-thumbnail rounded bg-overlay-light" />
          <div className="h-500 w-skeleton-line-wide rounded bg-overlay-light" />
        </div>
      </div>

      {/* Buttons skeleton */}
      <div className="space-y-200 pt-200">
        <div className="h-800 w-full rounded bg-overlay-light" />
        <div className="h-650 w-full rounded bg-overlay-light" />
      </div>
    </div>
  )
}
