import { resolve } from "node:path"
import {
  runRoDemoCommerceCloneHarness,
  writeRoDemoCommerceCloneHarnessReport,
} from "./clone-harness"

type CliOptions = Readonly<{
  manifestPath: string
  planOutputPath: string
  reportOutputPath: string
  snapshotOutputPath: string
}>

const valueAfter = (args: readonly string[], flag: string) => {
  const positions = args.flatMap((argument, index) =>
    argument === flag ? [index] : []
  )
  if (positions.length !== 1) {
    throw new Error(`${flag} must be provided exactly once`)
  }
  const value = args[(positions[0] as number) + 1]
  if (!(value && !value.startsWith("--"))) {
    throw new Error(`${flag} requires a value`)
  }
  return value
}

export const parseCloneHarnessCliOptions = (
  args: readonly string[]
): CliOptions => {
  const allowed = new Set([
    "--manifest",
    "--plan-output",
    "--report-output",
    "--snapshot-output",
  ])
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index]
    if (!(flag && allowed.has(flag))) {
      throw new Error(`unknown clone harness option ${flag ?? "<missing>"}`)
    }
  }
  return {
    manifestPath: valueAfter(args, "--manifest"),
    planOutputPath: valueAfter(args, "--plan-output"),
    reportOutputPath: valueAfter(args, "--report-output"),
    snapshotOutputPath: valueAfter(args, "--snapshot-output"),
  }
}

const main = async () => {
  const cli = parseCloneHarnessCliOptions(process.argv.slice(2))
  const databaseUrl = process.env.RO_DEMO_DISPOSABLE_DATABASE_URL
  const markerToken = process.env.RO_DEMO_DISPOSABLE_MARKER
  if (!databaseUrl) {
    throw new Error("RO_DEMO_DISPOSABLE_DATABASE_URL is required")
  }
  if (!markerToken) {
    throw new Error("RO_DEMO_DISPOSABLE_MARKER is required")
  }
  const abortController = new AbortController()
  const options = {
    databaseUrl,
    manifestPath: resolve(cli.manifestPath),
    markerToken,
    planOutputPath: resolve(cli.planOutputPath),
    snapshotOutputPath: resolve(cli.snapshotOutputPath),
    signal: abortController.signal,
    workingDirectory: resolve(__dirname, "../../.."),
  }
  let interruptedSignal: NodeJS.Signals | undefined
  const handleSignal = (signal: NodeJS.Signals) => {
    interruptedSignal ??= signal
    abortController.abort(
      new Error(`${signal} requested guarded disposable rollback`)
    )
    process.stderr.write(
      `${signal} received; waiting for guarded disposable rollback before exit\n`
    )
  }
  process.on("SIGINT", handleSignal)
  process.on("SIGTERM", handleSignal)
  try {
    const report = await runRoDemoCommerceCloneHarness(options)
    if (interruptedSignal) {
      throw new Error(
        `${interruptedSignal} received; disposable rollback completed; report not published`
      )
    }
    await writeRoDemoCommerceCloneHarnessReport(
      resolve(cli.reportOutputPath),
      report
    )
    process.stdout.write(
      `Disposable RO commerce verification passed; rollback=${report.rollbackVerified}; plan=${report.planHash}\n`
    )
  } finally {
    process.off("SIGINT", handleSignal)
    process.off("SIGTERM", handleSignal)
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : "clone harness failed"}\n`
    )
    process.exitCode = 1
  })
}
