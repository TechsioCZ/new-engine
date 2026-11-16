import { createContext, useContext } from "react"
import type { CommandApi, CommandItem } from "../../molecules/command"

export const CommandContext = createContext<CommandApi | null>(null)
export const CommandItemContext = createContext<CommandItem | null>(null)

export function useCommandContext() {
  const api = useContext(CommandContext)
  if (!api) {
    throw new Error("Command components must be used within Command.Root")
  }
  return api
}

export function useCommandItemContext() {
  const item = useContext(CommandItemContext)
  if (!item) {
    throw new Error("Command.ItemText must be used within Command.Item")
  }
  return item
}
