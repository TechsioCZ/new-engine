import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const MAX_OUTPUT_BYTES = 2 * 1024 * 1024
const LOADER = fileURLToPath(
  new URL("../../node_modules/tsx/dist/loader.mjs", import.meta.url)
)
const PARSER = fileURLToPath(
  new URL("./live-producer-proof-parser.mjs", import.meta.url)
)
const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url))

export const loadProducerEvidence = async (producerEvidence) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", LOADER, PARSER], {
      cwd: APP_ROOT,
      env: { PATH: process.env.PATH },
      stdio: ["pipe", "pipe", "pipe"],
    })
    const stdout = []
    const stderr = []
    let stdoutBytes = 0
    let stderrBytes = 0
    let outputError
    const capture = (sink, chunk, kind) => {
      if (kind === "stdout") {
        stdoutBytes += chunk.length
        if (stdoutBytes > MAX_OUTPUT_BYTES) {
          outputError = new Error("producer parser stdout too large")
        }
      } else {
        stderrBytes += chunk.length
        if (stderrBytes > MAX_OUTPUT_BYTES) {
          outputError = new Error("producer parser stderr too large")
        }
      }
      if (outputError) {
        child.kill()
      }
      sink.push(chunk)
    }
    child.stdout.on("data", (chunk) => capture(stdout, chunk, "stdout"))
    child.stderr.on("data", (chunk) => capture(stderr, chunk, "stderr"))
    child.on("error", reject)
    child.on("close", (code) => {
      if (outputError) {
        reject(outputError)
        return
      }
      const errorText = Buffer.concat(stderr).toString("utf8").trim()
      if (code !== 0) {
        reject(
          new Error(`producer evidence parser failed (${code}): ${errorText}`)
        )
        return
      }
      try {
        resolve(JSON.parse(Buffer.concat(stdout).toString("utf8")))
      } catch (error) {
        reject(
          new Error(
            `producer evidence parser returned invalid JSON: ${error.message}`
          )
        )
      }
    })
    child.stdin.end(JSON.stringify(producerEvidence))
  })
