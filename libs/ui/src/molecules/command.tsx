/**
 * Command — @techsio/ui-kit molecule.
 *
 * @component Command
 * @componentVersion v1.0.0
 * @skill command-usage
 * @changelog libs/ui/stories/changelog/changelog.stories.tsx
 */
import * as combobox from "@zag-js/combobox"
import { createFilter } from "@zag-js/i18n-utils"
import {
  mergeProps,
  normalizeProps,
  type PropTypes,
  useMachine,
} from "@zag-js/react"
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react"
import {
  CommandContext,
  CommandItemContext,
  useCommandContext,
  useCommandItemContext,
} from "../internal/molecules/command.context"
import { Input } from "../atoms/input"
import { Label } from "../atoms/label"
import { tv } from "../utils"

export type CommandItem = {
  value: string
  label: string
  keywords?: string[]
  disabled?: boolean
  group?: string
}

export type CommandApi = combobox.Api<PropTypes, CommandItem>
export type CommandProps = Pick<
  combobox.Props<CommandItem>,
  | "disabled"
  | "loopFocus"
  | "onSelect"
  | "inputValue"
  | "defaultInputValue"
  | "onInputValueChange"
> & {
  items: CommandItem[]
  children: ReactNode
  id?: string
  className?: string
  ref?: ComponentProps<"div">["ref"]
  locale?: string
  onEscape?: () => void
}

const commandVariants = tv({
  slots: {
    root: "border-(length:--border-width-command) flex w-full flex-col gap-command-gap rounded-command border-command-border bg-command-bg p-command text-command-fg text-command-md",
    control: "relative flex items-center",
    list: "max-h-command-list-max overflow-y-auto overscroll-contain p-command-list",
    item: "flex w-full cursor-pointer select-none items-center gap-command-item-gap rounded-command-item px-command-item-x py-command-item-y data-disabled:cursor-not-allowed data-highlighted:bg-command-item-bg-highlighted data-disabled:text-command-item-fg-disabled",
    itemText: "min-w-0 flex-1",
    itemGroup: "",
    itemGroupLabel:
      "px-command-item-x py-command-item-y font-command-group-label text-command-group-label-fg",
    empty: "text-center text-command-empty-fg data-empty:p-command-empty",
  },
})

export function Command({
  items,
  children,
  id,
  className,
  ref,
  disabled,
  loopFocus = true,
  onSelect,
  locale,
  inputValue,
  defaultInputValue = "",
  onInputValueChange,
  onEscape,
}: CommandProps) {
  const generatedId = useId()
  const [uncontrolledQuery, setUncontrolledQuery] = useState(defaultInputValue)
  const query = inputValue ?? uncontrolledQuery
  const collection = useMemo(() => {
    const filter = createFilter({ sensitivity: "base", locale })
    return combobox.collection({
      items: items.filter(
        (item) =>
          filter.contains(item.label, query) ||
          item.keywords?.some((keyword) => filter.contains(keyword, query))
      ),
      itemToValue: (item) => item.value,
      itemToString: (item) => item.label,
      isItemDisabled: (item) => !!item.disabled,
    })
  }, [items, query, locale])
  const service = useMachine(combobox.machine, {
    id: id ?? generatedId,
    collection,
    disabled,
    loopFocus,
    onSelect,
    inputValue: query,
    onInputValueChange(details) {
      if (inputValue === undefined) {
        setUncontrolledQuery(details.inputValue)
      }
      onInputValueChange?.(details)
    },
    onOpenChange(details) {
      if (!details.open && details.reason === "escape-key") {
        onEscape?.()
      }
    },
    open: true,
    disableLayer: true,
    inputBehavior: "autohighlight",
    selectionBehavior: "preserve",
    closeOnSelect: false,
  })
  const api = combobox.connect<PropTypes, CommandItem>(service, normalizeProps)

  useEffect(() => {
    // Zag 1.41.2 can retain a highlighted item after it becomes disabled.
    if (api.collection.find(api.highlightedValue)?.disabled) {
      api.clearHighlightValue()
    }
  }, [api])

  return (
    <CommandContext.Provider value={api}>
      <div
        {...api.getRootProps()}
        className={commandVariants().root({ className })}
        ref={ref}
      >
        {children}
      </div>
    </CommandContext.Provider>
  )
}

Command.Root = Command

Command.Label = function CommandLabel({
  children,
  ...props
}: ComponentProps<typeof Label>) {
  const api = useCommandContext()
  return <Label {...mergeProps(props, api.getLabelProps())}>{children}</Label>
}

Command.Control = function CommandControl({
  className,
  ...props
}: ComponentProps<"div">) {
  const api = useCommandContext()
  return (
    <div
      {...mergeProps(props, api.getControlProps())}
      className={commandVariants().control({ className })}
    />
  )
}

Command.Input = function CommandInput({
  size,
  ...props
}: ComponentProps<typeof Input>) {
  const api = useCommandContext()
  return <Input {...mergeProps(props, api.getInputProps())} size={size} />
}

Command.List = function CommandList({
  className,
  ...props
}: ComponentProps<"div">) {
  const api = useCommandContext()
  return (
    <div
      {...mergeProps(props, api.getContentProps())}
      className={commandVariants().list({ className })}
    />
  )
}

Command.ItemGroup = function CommandItemGroup({
  id,
  className,
  ...props
}: ComponentProps<"div"> & { id: string }) {
  const api = useCommandContext()
  return (
    <div
      {...mergeProps(props, api.getItemGroupProps({ id }))}
      className={commandVariants().itemGroup({ className })}
    />
  )
}

Command.ItemGroupLabel = function CommandItemGroupLabel({
  htmlFor,
  className,
  ...props
}: ComponentProps<"div"> & { htmlFor: string }) {
  const api = useCommandContext()
  return (
    <div
      {...mergeProps(props, api.getItemGroupLabelProps({ htmlFor }))}
      className={commandVariants().itemGroupLabel({ className })}
    />
  )
}

Command.Item = function CommandItemPart({
  item,
  className,
  ...props
}: ComponentProps<"div"> & { item: CommandItem }) {
  const api = useCommandContext()
  return (
    <CommandItemContext.Provider value={item}>
      <div
        {...mergeProps(props, api.getItemProps({ item }))}
        className={commandVariants().item({ className })}
      />
    </CommandItemContext.Provider>
  )
}

Command.ItemText = function CommandItemText({
  className,
  children,
  ...props
}: ComponentProps<"span">) {
  const api = useCommandContext()
  const item = useCommandItemContext()
  return (
    <span
      {...mergeProps(props, api.getItemTextProps({ item }))}
      className={commandVariants().itemText({ className })}
    >
      {children ?? item.label}
    </span>
  )
}

Command.Context = function CommandContextPart({
  children,
}: {
  children: (api: CommandApi) => ReactNode
}) {
  return children(useCommandContext())
}

Command.Empty = function CommandEmpty({
  children,
  className,
  ...props
}: ComponentProps<"output">) {
  const api = useCommandContext()
  const empty = api.collection.size === 0
  return (
    <output
      {...props}
      className={commandVariants().empty({ className })}
      data-empty={empty || undefined}
    >
      {empty ? children : null}
    </output>
  )
}
