/**
 * Reads a Codex subagent file (`com.openai/agents/*.toml`).
 *
 * Supports the TOML subset those files use: comments, `key = "basic string"`,
 * `key = """multi-line basic string"""` and single-line arrays of basic strings.
 * Anything else throws, so a new construct fails the build instead of being dropped.
 */

const ESCAPES = {
  b: "\b",
  t: "\t",
  n: "\n",
  f: "\f",
  r: "\r",
  '"': '"',
  "\\": "\\",
}

const ESCAPE_RE = /\\(u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8}|.)/g
const BASIC_STRING = /"((?:[^"\\]|\\.)*)"/y
const ASSIGNMENT_RE = /^([A-Za-z0-9_-]+)\s*=\s*(.*)$/
const TRAILING_COMMENT_RE = /^#.*/
const CRLF_RE = /\r\n/g

function decodeEscapes(raw, where) {
  return raw.replace(ESCAPE_RE, (_, esc) => {
    if (esc[0] === "u" || esc[0] === "U") {
      return String.fromCodePoint(Number.parseInt(esc.slice(1), 16))
    }
    if (!(esc in ESCAPES)) {
      throw new Error(`${where}: unsupported escape \\${esc}`)
    }
    return ESCAPES[esc]
  })
}

function matchBasicString(text) {
  BASIC_STRING.lastIndex = 0
  return BASIC_STRING.exec(text)
}

function parseArray(body, where) {
  const items = []
  let rest = body.trim()
  while (rest) {
    const match = matchBasicString(rest)
    if (!match) {
      throw new Error(`${where}: arrays may only hold basic strings`)
    }
    items.push(decodeEscapes(match[1], where))
    rest = rest.slice(match[0].length).trim()
    if (rest.startsWith(",")) {
      rest = rest.slice(1).trim()
    } else if (rest) {
      throw new Error(`${where}: expected "," between array items`)
    }
  }
  return items
}

/**
 * Read a multi-line basic string that opens on `lines[start]` (after `key = `).
 * A newline right after the opening quotes is trimmed. Returns the value and the
 * index of the line holding the closing quotes.
 */
function readMultiline(lines, start, value, where) {
  const collected = [value.slice(3)]
  let end = start
  let closed = collected[0].length >= 3 && collected[0].endsWith('"""')
  while (!closed) {
    end += 1
    if (end >= lines.length) {
      throw new Error(`${where}: unterminated """ string`)
    }
    collected.push(lines[end])
    closed = lines[end].trimEnd().endsWith('"""')
  }
  let text = collected.join("\n").trimEnd().slice(0, -3)
  if (text.startsWith("\n")) {
    text = text.slice(1)
  }
  return { value: decodeEscapes(text, where), end }
}

/** A single-line value: a one-line array or a basic string. */
function parseInlineValue(key, value, where) {
  if (value.startsWith("[")) {
    if (!value.endsWith("]")) {
      throw new Error(`${where}: arrays must fit on one line`)
    }
    return parseArray(value.slice(1, -1), where)
  }
  const match = matchBasicString(value)
  const trailing = match
    ? value.slice(match[0].length).trim().replace(TRAILING_COMMENT_RE, "")
    : ""
  if (!match || trailing) {
    throw new Error(`${where}: unsupported value for "${key}"`)
  }
  return decodeEscapes(match[1], where)
}

/** Parse a Codex agent TOML source into a plain object. */
export function parseCodexAgentToml(source, file = "agent.toml") {
  const result = {}
  const lines = source.replace(CRLF_RE, "\n").split("\n")
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || line.startsWith("#")) {
      continue
    }
    const where = `${file}:${i + 1}`
    const assignment = ASSIGNMENT_RE.exec(line)
    if (!assignment) {
      throw new Error(`${where}: expected key = value`)
    }
    const [, key, value] = assignment
    if (key in result) {
      throw new Error(`${where}: duplicate key "${key}"`)
    }
    if (value.startsWith('"""')) {
      const multiline = readMultiline(lines, i, value, where)
      result[key] = multiline.value
      i = multiline.end
      continue
    }
    result[key] = parseInlineValue(key, value, where)
  }
  for (const required of ["name", "description", "developer_instructions"]) {
    if (typeof result[required] !== "string" || !result[required].trim()) {
      throw new Error(`${file}: missing "${required}"`)
    }
  }
  return result
}
