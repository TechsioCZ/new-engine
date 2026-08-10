import { randomBytes, randomInt } from "node:crypto"

import { getPreviewRandomOnceSecretDefinitions } from "../contracts/stack-inputs.js"
import type {
  StackInputs,
  PreviewRandomOnceSecretDefinition,
} from "../contracts/stack-inputs.js"
import type { PreviewRandomOnceSecretInput } from "../contracts/verify.js"

const alnumChars =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

const unsupportedSecretGenerator = (value: unknown): never => {
  throw new Error(`Unsupported secret generator kind: ${String(value)}`)
}

const generateSecretValue = (
  definition: PreviewRandomOnceSecretDefinition,
): string => {
  const { kind } = definition.generator

  switch (kind) {
    case "random_hex": {
      if (
        definition.generator.bytes === undefined ||
        definition.generator.bytes === 0
      ) {
        throw new Error("random_hex generator requires numeric bytes.")
      }
      return randomBytes(definition.generator.bytes).toString("hex")
    }
    case "random_base64url": {
      if (
        definition.generator.bytes === undefined ||
        definition.generator.bytes === 0
      ) {
        throw new Error("random_base64url generator requires numeric bytes.")
      }
      return randomBytes(definition.generator.bytes).toString("base64url")
    }
    case "random_alnum": {
      if (
        definition.generator.length === undefined ||
        definition.generator.length === 0
      ) {
        throw new Error("random_alnum generator requires numeric length.")
      }

      let value = ""
      while (value.length < definition.generator.length) {
        value += alnumChars[randomInt(0, alnumChars.length)]
      }
      return value
    }
    case undefined: {
      return unsupportedSecretGenerator(kind)
    }
    default: {
      return unsupportedSecretGenerator(kind)
    }
  }
}

export const generatePreviewRandomOnceSecrets = (
  stackInputs: StackInputs,
): PreviewRandomOnceSecretInput[] =>
  getPreviewRandomOnceSecretDefinitions(stackInputs).map((definition) => ({
    ...definition,
    value: generateSecretValue(definition),
  }))
