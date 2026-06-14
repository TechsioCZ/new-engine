import { EllipsisHorizontal } from "@medusajs/icons"
import { clx, DropdownMenu, IconButton } from "@medusajs/ui"
import type { ReactNode } from "react"
import { Link } from "react-router-dom"

export type Action = {
  icon: ReactNode
  label: string
  disabled?: boolean
} & (
  | {
      to: string
      onClick?: never
    }
  | {
      onClick: () => void
      to?: never
    }
)

export type ActionGroup = {
  actions: Action[]
}

type ActionMenuProps = {
  groups: ActionGroup[]
}

export const ActionMenu = ({ groups }: ActionMenuProps) => (
  <DropdownMenu>
    <DropdownMenu.Trigger asChild>
      <IconButton size="small" variant="transparent">
        <EllipsisHorizontal />
      </IconButton>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      {groups.map((group, index) => {
        if (!group.actions.length) {
          return null
        }

        const isLast = index === groups.length - 1
        const groupKey = group.actions.map((action) => action.label).join("-")

        return (
          <DropdownMenu.Group key={groupKey}>
            {group.actions.map((action) => {
              if (action.onClick) {
                return (
                  <DropdownMenu.Item
                    className={clx(
                      "flex items-center gap-x-2 [&_svg]:text-ui-fg-subtle",
                      {
                        "[&_svg]:text-ui-fg-disabled": action.disabled,
                      }
                    )}
                    disabled={action.disabled}
                    key={action.label}
                    onClick={(e) => {
                      e.stopPropagation()
                      action.onClick()
                    }}
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </DropdownMenu.Item>
                )
              }

              return (
                <div key={action.label}>
                  <DropdownMenu.Item
                    asChild
                    className={clx(
                      "flex items-center gap-x-2 [&_svg]:text-ui-fg-subtle",
                      {
                        "[&_svg]:text-ui-fg-disabled": action.disabled,
                      }
                    )}
                    disabled={action.disabled}
                  >
                    <Link onClick={(e) => e.stopPropagation()} to={action.to}>
                      {action.icon}
                      <span>{action.label}</span>
                    </Link>
                  </DropdownMenu.Item>
                </div>
              )
            })}
            {!isLast && <DropdownMenu.Separator />}
          </DropdownMenu.Group>
        )
      })}
    </DropdownMenu.Content>
  </DropdownMenu>
)
