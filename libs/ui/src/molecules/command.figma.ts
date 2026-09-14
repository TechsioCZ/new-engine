// url=https://www.figma.com/design/gi5GUSWwAeXknaKEeLqK5w/New-Design-System?node-id=3329-17222
// source=https://github.com/NMIT-WR/new-engine/blob/master/libs/ui/src/molecules/command.tsx
// component=Command

import figma from "figma"

const state = figma.selectedInstance.getEnum("state", {
  default: "default",
  highlighted: "highlighted",
  disabledItem: "disabled-item",
  disabled: "disabled",
  grouped: "grouped",
  empty: "empty",
})
const label = figma.selectedInstance.getString("Label")
const emptyMessage = figma.selectedInstance.getString("Empty message")
const disabled = state === "disabled"
const defaultInputValue = state === "empty" ? "no-such-action" : undefined
const items =
  state === "empty"
    ? []
    : state === "grouped"
      ? [
          { value: "overview", label: "Overview", group: "Navigation" },
          { value: "orders", label: "Orders", group: "Navigation" },
          { value: "settings", label: "Settings", group: "Account" },
        ]
      : [
          { value: "overview", label: "Overview" },
          {
            value: "orders",
            label: "Orders",
            ...(state === "disabled-item" ? { disabled: true } : {}),
          },
          { value: "settings", label: "Settings" },
        ]

const results =
  state === "grouped"
    ? figma.code`<Command.List>
        <Command.Context>
          {(api) =>
            [...new Set(api.collection.items.map(({ group }) => group))].map(
              (group) => (
                <Command.ItemGroup id={group ?? "Other"} key={group ?? "Other"}>
                  <Command.ItemGroupLabel htmlFor={group ?? "Other"}>
                    {group ?? "Other"}
                  </Command.ItemGroupLabel>
                  {api.collection.items
                    .filter((item) => item.group === group)
                    .map((item) => (
                      <Command.Item item={item} key={item.value}>
                        <Command.ItemText />
                      </Command.Item>
                    ))}
                </Command.ItemGroup>
              )
            )
          }
        </Command.Context>
      </Command.List>
      <Command.Empty>${emptyMessage}</Command.Empty>`
    : figma.code`<Command.List>
        <Command.Context>
          {(api) =>
            api.collection.items.map((item) => (
              <Command.Item item={item} key={item.value}>
                <Command.ItemText />
              </Command.Item>
            ))
          }
        </Command.Context>
      </Command.List>
      <Command.Empty>${emptyMessage}</Command.Empty>`

export default {
  id: "Command",
  imports: ['import { Command } from "@techsio/ui-kit/molecules/command"'],
  example: figma.code`<Command items={${figma.helpers.react.renderPropValue(
    items
  )}}${figma.helpers.react.renderProp(
    "defaultInputValue",
    defaultInputValue
  )}${figma.helpers.react.renderProp("disabled", disabled)}>
      <Command.Label>${label}</Command.Label>
      <Command.Control>
        <Command.Input placeholder="Search actions…" />
      </Command.Control>
      ${results}
    </Command>`,
  metadata: { nestable: true },
}
