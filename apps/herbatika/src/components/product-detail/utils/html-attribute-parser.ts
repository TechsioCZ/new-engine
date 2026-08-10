export interface ParsedHtmlAttribute {
  name: string
  value: string
}

const isAttributeNameCharacter = (character: string) =>
  /[a-zA-Z0-9:-]/u.test(character)

const skipWhitespace = (value: string, startIndex: number) => {
  let index = startIndex
  while (/\s/u.test(value[index] ?? "")) {
    index += 1
  }
  return index
}

const readAttributeName = (rawAttributes: string, startIndex: number) => {
  let index = startIndex
  while (isAttributeNameCharacter(rawAttributes[index] ?? "")) {
    index += 1
  }
  return {
    index,
    name: rawAttributes.slice(startIndex, index).toLowerCase(),
  }
}

const readQuotedAttributeValue = (
  rawAttributes: string,
  startIndex: number,
  quote: string,
) => {
  let index = startIndex
  while (index < rawAttributes.length && rawAttributes[index] !== quote) {
    index += 1
  }
  const value = rawAttributes.slice(startIndex, index)
  return {
    index: rawAttributes[index] === quote ? index + 1 : index,
    value,
  }
}

const readUnquotedAttributeValue = (
  rawAttributes: string,
  startIndex: number,
) => {
  let index = startIndex
  while (
    index < rawAttributes.length &&
    !/[\s"'=<>`]/u.test(rawAttributes[index] ?? "")
  ) {
    index += 1
  }
  return {
    index,
    value: rawAttributes.slice(startIndex, index),
  }
}

const readAttributeValue = (rawAttributes: string, startIndex: number) => {
  if (rawAttributes[startIndex] !== "=") {
    return { index: startIndex, value: "" }
  }
  const valueStart = skipWhitespace(rawAttributes, startIndex + 1)
  const quote = rawAttributes[valueStart]
  if (quote === '"' || quote === "'") {
    return readQuotedAttributeValue(rawAttributes, valueStart + 1, quote)
  }
  return readUnquotedAttributeValue(rawAttributes, valueStart)
}

export const parseTagAttributes = (
  rawAttributes: string,
): ParsedHtmlAttribute[] => {
  const attributes: ParsedHtmlAttribute[] = []
  let index = 0

  while (index < rawAttributes.length) {
    const nameStart = skipWhitespace(rawAttributes, index)
    const { index: nameEndIndex, name } = readAttributeName(
      rawAttributes,
      nameStart,
    )
    if (name === "") {
      index = nameStart + 1
    } else {
      const equalsIndex = skipWhitespace(rawAttributes, nameEndIndex)
      const { index: valueEndIndex, value } = readAttributeValue(
        rawAttributes,
        equalsIndex,
      )
      attributes.push({
        name,
        value: value.trim(),
      })
      index = valueEndIndex
    }
  }

  return attributes
}
