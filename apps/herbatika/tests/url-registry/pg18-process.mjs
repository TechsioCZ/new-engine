import { spawn } from "node:child_process"

const formatCommand = (command, args) =>
  [command, ...args]
    .map((part) => (part.includes(" ") ? JSON.stringify(part) : part))
    .join(" ")

export const runProcess = (
  command,
  args,
  { cwd, env = process.env, inheritOutput = false, timeoutMs = 60_000 } = {}
) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      stdio: inheritOutput ? "inherit" : ["ignore", "pipe", "pipe"],
      windowsHide: true,
    })
    let stdout = ""
    let stderr = ""
    child.stdout?.setEncoding("utf8")
    child.stderr?.setEncoding("utf8")
    child.stdout?.on("data", (chunk) => {
      stdout += chunk
    })
    child.stderr?.on("data", (chunk) => {
      stderr += chunk
    })

    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      reject(
        new Error(
          `${formatCommand(command, args)} timed out after ${timeoutMs}ms`
        )
      )
    }, timeoutMs)

    child.once("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once("exit", (code, signal) => {
      clearTimeout(timer)
      if (code === 0) {
        resolve({ stdout, stderr })
        return
      }
      const detail = stderr.trim() || stdout.trim() || `signal ${signal}`
      reject(
        new Error(
          `${formatCommand(command, args)} exited with ${String(code)}: ${detail}`
        )
      )
    })
  })
