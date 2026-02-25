import { Button, DropdownMenu } from "@medusajs/ui"
import type { ReactNode } from "react"
import { useSearchParams } from "react-router-dom"

type FilterGroupProps = {
  filters: {
    [key: string]: ReactNode
  }
}

export const FilterGroup = ({ filters }: FilterGroupProps) => {
  const [searchParams] = useSearchParams()
  const filterKeys = Object.keys(filters)

  if (filterKeys.length === 0) {
    return null
  }

  const isClearable = filterKeys.some((key) => searchParams.get(key))
  const hasMore = !filterKeys.every((key) => searchParams.get(key))
  const availableKeys = filterKeys.filter((key) => !searchParams.get(key))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {hasMore && <AddFilterMenu availableKeys={availableKeys} />}
      {isClearable && (
        <Button size="small" variant="transparent">
          Clear all
        </Button>
      )}
    </div>
  )
}

type AddFilterMenuProps = {
  availableKeys: string[]
}

const AddFilterMenu = ({ availableKeys }: AddFilterMenuProps) => (
  <DropdownMenu>
    <DropdownMenu.Trigger asChild>
      <Button size="small" variant="secondary">
        Add filter
      </Button>
    </DropdownMenu.Trigger>
    <DropdownMenu.Content>
      {availableKeys.map((key) => (
        <DropdownMenu.Item key={key}>{key}</DropdownMenu.Item>
      ))}
    </DropdownMenu.Content>
  </DropdownMenu>
)
