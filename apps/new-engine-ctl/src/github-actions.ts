import { appendFile } from "node:fs/promises"

export const appendGitHubOutput = async (
  key: string,
  value: string,
): Promise<void> => {
  if (
    process.env["GITHUB_OUTPUT"] === undefined ||
    process.env["GITHUB_OUTPUT"] === ""
  ) {
    return
  }

  await appendFile(process.env["GITHUB_OUTPUT"], `${key}=${value}\n`, "utf-8")
}

export const maskGitHubValue = (value: string | undefined): void => {
  if (
    process.env["GITHUB_ACTIONS"] === "true" &&
    value !== undefined &&
    value !== ""
  ) {
    process.stdout.write(`::add-mask::${value}\n`)
  }
}

export const warnGitHub = (message: string): void => {
  if (process.env["GITHUB_ACTIONS"] === "true") {
    process.stderr.write(`::warning::${message}\n`)
    return
  }

  process.stderr.write(`warning: ${message}\n`)
}
