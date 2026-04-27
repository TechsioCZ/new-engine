import { randomBytes, randomInt } from "node:crypto"

import type { StackInputs } from "../contracts/stack-inputs.js"
import {
  getPreviewRandomOnceSecretDefinitions,
  type PreviewRandomOnceSecretDefinition,
} from "../contracts/stack-inputs.js"
import type { PreviewRandomOnceSecretInput } from "../contracts/verify.js"

const alnumChars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

function generateSecretValue(
  definition: PreviewRandomOnceSecretDefinition
): string {
  const kind = definition.generator.kind

  switch (kind) {
    case "random_hex":
      if (!definition.generator.bytes) {
        throw new Error("random_hex generator requires numeric bytes.")
      }
      return randomBytes(definition.generator.bytes).toString("hex")
    case "random_base64url":
      if (!definition.generator.bytes) {
        throw new Error("random_base64url generator requires numeric bytes.")
      }
      return randomBytes(definition.generator.bytes).toString("base64url")
    case "random_alnum": {
      if (!definition.generator.length) {
        throw new Error("random_alnum generator requires numeric length.")
      }

      let value = ""
      while (value.length < definition.generator.length) {
        value += alnumChars[randomInt(0, alnumChars.length)]
      }
      return value
    }
    default:
      throw new Error(`Unsupported secret generator kind: ${kind ?? "<empty>"}`)
  }
}

export function generatePreviewRandomOnceSecrets(
  stackInputs: StackInputs
): PreviewRandomOnceSecretInput[] {
  return getPreviewRandomOnceSecretDefinitions(stackInputs).map(
    (definition) => ({
      ...definition,
      value: generateSecretValue(definition),
    })
  )
}
