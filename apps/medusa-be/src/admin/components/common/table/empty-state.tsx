import { ExclamationCircle, MagnifyingGlass, PlusMini } from "@medusajs/icons"
import { Button, clx, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

export type NoResultsProps = {
  title?: string
  message?: string
  className?: string
}

export const NoResults = ({ title, message, className }: NoResultsProps) => {
  const { t } = useTranslation()

  return (
    <div
      className={clx(
        "flex h-[400px] w-full items-center justify-center",
        className
      )}
    >
      <div className="flex flex-col items-center gap-y-2">
        <MagnifyingGlass />
        <Text leading="compact" size="small" weight="plus">
          {title ?? t("general.noResultsTitle")}
        </Text>
        <Text className="text-ui-fg-subtle" size="small">
          {message ?? t("general.noResultsMessage")}
        </Text>
      </div>
    </div>
  )
}

type ActionProps = {
  action?: {
    to: string
    label: string
  }
}

type NoRecordsProps = {
  title?: string
  message?: string
  className?: string
  buttonVariant?: string
} & ActionProps

const DefaultButton = ({ action }: ActionProps) =>
  action && (
    <Link to={action.to}>
      <Button size="small" variant="secondary">
        {action.label}
      </Button>
    </Link>
  )

const TransparentIconLeftButton = ({ action }: ActionProps) =>
  action && (
    <Link to={action.to}>
      <Button className="text-ui-fg-interactive" variant="transparent">
        <PlusMini /> {action.label}
      </Button>
    </Link>
  )

export const NoRecords = ({
  title,
  message,
  action,
  className,
  buttonVariant = "default",
}: NoRecordsProps) => {
  const { t } = useTranslation()

  return (
    <div
      className={clx(
        "flex h-[400px] w-full flex-col items-center justify-center gap-y-4",
        className
      )}
    >
      <div className="flex flex-col items-center gap-y-3">
        <ExclamationCircle className="text-ui-fg-subtle" />

        <div className="flex flex-col items-center gap-y-1">
          <Text leading="compact" size="small" weight="plus">
            {title ?? t("general.noRecordsTitle")}
          </Text>

          <Text className="text-ui-fg-muted" size="small">
            {message ?? t("general.noRecordsMessage")}
          </Text>
        </div>
      </div>

      {buttonVariant === "default" && <DefaultButton action={action} />}
      {buttonVariant === "transparentIconLeft" && (
        <TransparentIconLeftButton action={action} />
      )}
    </div>
  )
}
