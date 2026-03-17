interface ZaneEnvVariable {
  id: string
  key: string
  value: string
}

interface ZaneEnvVariableChange {
  type?: "ADD" | "UPDATE" | "DELETE" | string
  field?: string
  item_id?: string | null
  new_value?: Record<string, unknown> | null
}

interface ZaneEnvVariableServiceState {
  env_variables: ZaneEnvVariable[]
  unapplied_changes?: ZaneEnvVariableChange[]
}

function coercePendingEnvVariable(
  value: Record<string, unknown> | null | undefined
): ZaneEnvVariable | null {
  if (!value || typeof value.key !== "string" || typeof value.value !== "string") {
    return null
  }

  return {
    id: typeof value.id === "string" ? value.id : "",
    key: value.key,
    value: value.value,
  }
}

export function computeEffectiveEnvVariables(
  serviceDetails: ZaneEnvVariableServiceState
): ZaneEnvVariable[] {
  const envVariables = [...(serviceDetails.env_variables ?? [])]

  for (const change of serviceDetails.unapplied_changes ?? []) {
    if (change.field !== "env_variables" || typeof change.type !== "string") {
      continue
    }

    if (change.type === "DELETE" && change.item_id) {
      const index = envVariables.findIndex((envVar) => envVar.id === change.item_id)
      if (index >= 0) {
        envVariables.splice(index, 1)
      }
      continue
    }

    const pendingEnvVariable = coercePendingEnvVariable(change.new_value)
    if (!pendingEnvVariable) {
      continue
    }

    const existingIndexById =
      change.item_id != null
        ? envVariables.findIndex((envVar) => envVar.id === change.item_id)
        : -1
    const existingIndexByKey = envVariables.findIndex(
      (envVar) => envVar.key === pendingEnvVariable.key
    )
    const targetIndex =
      existingIndexById >= 0 ? existingIndexById : existingIndexByKey

    if (change.type === "UPDATE") {
      const nextValue = {
        ...(targetIndex >= 0 ? envVariables[targetIndex] : pendingEnvVariable),
        ...pendingEnvVariable,
        id: change.item_id ?? pendingEnvVariable.id,
      }

      if (targetIndex >= 0) {
        envVariables[targetIndex] = nextValue
      } else {
        envVariables.push(nextValue)
      }
      continue
    }

    if (change.type === "ADD") {
      if (targetIndex >= 0) {
        envVariables[targetIndex] = {
          ...envVariables[targetIndex],
          ...pendingEnvVariable,
          id: envVariables[targetIndex]?.id ?? pendingEnvVariable.id,
        }
      } else {
        envVariables.push(pendingEnvVariable)
      }
    }
  }

  return envVariables
}
