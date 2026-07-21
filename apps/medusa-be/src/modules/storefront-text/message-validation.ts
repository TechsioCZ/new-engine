import {
  isStructurallySame,
  parse,
  type ParserOptions,
} from "@formatjs/icu-messageformat-parser"
import { isObjectRecord } from "../../utils/guards"

type StorefrontTextMessageValidationFailure = {
  code: "invalid_default" | "invalid_override" | "incompatible_override"
  message: string
  success: false
}

type StorefrontTextMessageValidationResult =
  | StorefrontTextMessageValidationFailure
  | { success: true }

const getErrorLocation = (error: Error) => {
  if (!("location" in error) || !isObjectRecord(error.location)) {
    return null
  }

  const { start } = error.location
  if (!isObjectRecord(start)) {
    return null
  }

  const { column, line } = start
  return typeof column === "number" && typeof line === "number"
    ? { column, line }
    : null
}

const getErrorMessage = (error: unknown) => {
  if (!(error instanceof Error)) {
    return "Unknown ICU MessageFormat error"
  }

  const location = getErrorLocation(error)

  return location
    ? `${error.message} at line ${location.line}, column ${location.column}`
    : error.message
}

const getParserOptions = (locale?: string) =>
  ({
    ignoreTag: false,
    ...(locale ? { locale: new Intl.Locale(locale) } : {}),
    requiresOtherClause: true,
    shouldParseSkeletons: true,
  }) satisfies ParserOptions

export const validateStorefrontTextOverride = ({
  defaultValue,
  locale,
  overrideValue,
}: {
  defaultValue: string
  locale?: string
  overrideValue: string
}): StorefrontTextMessageValidationResult => {
  let parserOptions: ParserOptions

  try {
    parserOptions = getParserOptions(locale)
  } catch (error) {
    return {
      code: "invalid_default",
      message: `Default value has an invalid locale: ${getErrorMessage(error)}`,
      success: false,
    }
  }

  let defaultMessage

  try {
    defaultMessage = parse(defaultValue, parserOptions)
  } catch (error) {
    return {
      code: "invalid_default",
      message: `Default value contains invalid ICU syntax: ${getErrorMessage(error)}`,
      success: false,
    }
  }

  let overrideMessage

  try {
    overrideMessage = parse(overrideValue, parserOptions)
  } catch (error) {
    return {
      code: "invalid_override",
      message: `Custom value contains invalid ICU syntax: ${getErrorMessage(error)}`,
      success: false,
    }
  }

  try {
    const comparison = isStructurallySame(defaultMessage, overrideMessage)

    if (!comparison.success) {
      return {
        code: "incompatible_override",
        message: `Custom value must preserve the default ICU arguments: ${getErrorMessage(comparison.error)}`,
        success: false,
      }
    }
  } catch (error) {
    return {
      code: "incompatible_override",
      message: `Custom value has incompatible ICU arguments: ${getErrorMessage(error)}`,
      success: false,
    }
  }

  return { success: true }
}
