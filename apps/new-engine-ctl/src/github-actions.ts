import { appendFile } from "node:fs/promises"

export async function appendGitHubOutput(
  key: string,
  value: string
): Promise<void> {
  if (!process.env.GITHUB_OUTPUT) {
    return
  }

  await appendFile(process.env.GITHUB_OUTPUT, `${key}=${value}\n`, "utf8")
}

export function maskGitHubValue(value: string | undefined): void {
  if (process.env.GITHUB_ACTIONS === "true" && value) {
    process.stdout.write(`::add-mask::${value}\n`)
  }
}

export function warnGitHub(message: string): void {
  if (process.env.GITHUB_ACTIONS === "true") {
    process.stderr.write(`::warning::${message}\n`)
    return
  }

  process.stderr.write(`warning: ${message}\n`)
}
