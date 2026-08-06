interface ZaneEnvVariable {
  id: string
  key: string
  value: string
}

interface ZaneEnvVariableChange {
  type?: string
  field?: string
  item_id?: string | null
  new_value?: Record<string, unknown> | null
}

interface ZaneEnvVariableServiceState {
  env_variables: ZaneEnvVariable[]
  unapplied_changes?: ZaneEnvVariableChange[]
}

const coercePendingEnvVariable = (
  value: Record<string, unknown> | null | undefined,
): ZaneEnvVariable | null => {
  if (
    value === null ||
    value === undefined ||
    typeof value.key !== "string" ||
    typeof value.value !== "string"
  ) {
    return null
  }

  return {
    id: typeof value.id === "string" ? value.id : "",
    key: value.key,
    value: value.value,
  }
}

const applyPendingEnvVariableChange = (
  envVariables: ZaneEnvVariable[],
  change: ZaneEnvVariableChange,
): void => {
  if (change.field !== "env_variables" || typeof change.type !== "string") {
    return
  }

  const itemId = change.item_id
  if (
    change.type === "DELETE" &&
    itemId !== undefined &&
    itemId !== null &&
    itemId !== ""
  ) {
    const index = envVariables.findIndex((envVar) => envVar.id === itemId)
    if (index !== -1) {
      envVariables.splice(index, 1)
    }
    return
  }

  const pendingEnvVariable = coercePendingEnvVariable(change.new_value)
  if (pendingEnvVariable === null) {
    return
  }

  const existingIndexById =
    itemId !== null && itemId !== undefined
      ? envVariables.findIndex((envVar) => envVar.id === itemId)
      : -1
  const existingIndexByKey = envVariables.findIndex(
    (envVar) => envVar.key === pendingEnvVariable.key,
  )
  const targetIndex =
    existingIndexById >= 0 ? existingIndexById : existingIndexByKey

  if (change.type === "UPDATE") {
    const nextValue = {
      ...(targetIndex >= 0 ? envVariables[targetIndex] : pendingEnvVariable),
      ...pendingEnvVariable,
      id: itemId ?? pendingEnvVariable.id,
    }

    if (targetIndex >= 0) {
      envVariables[targetIndex] = nextValue
    } else {
      envVariables.push(nextValue)
    }
    return
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

export const computeEffectiveEnvVariables = (
  serviceDetails: ZaneEnvVariableServiceState,
): ZaneEnvVariable[] => {
  const envVariables = [...serviceDetails.env_variables]

  for (const change of serviceDetails.unapplied_changes ?? []) {
    applyPendingEnvVariableChange(envVariables, change)
  }

  return envVariables
}
