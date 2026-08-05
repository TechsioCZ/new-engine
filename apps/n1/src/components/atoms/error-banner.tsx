interface ErrorBannerProps {
  title: string
  message: string
  className?: string
}

export const ErrorBanner = ({
  title,
  message,
  className = "",
}: ErrorBannerProps) => (
  <div
    className={`rounded-md p-100 text-danger text-sm ${className}`}
    role="alert"
  >
    <p className="font-medium">{title}</p>
    <p className="mt-50 text-xs">{message}</p>
  </div>
)
