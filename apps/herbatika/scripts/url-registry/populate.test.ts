import { describe, expect, it, vi } from "vitest"
import { parseArguments, readPopulationManifestText } from "./populate"

describe("URL registry population CLI input", () => {
  it("preserves stdin as the manifest source", () => {
    expect(parseArguments(["--manifest", "-"])).toMatchObject({
      apply: false,
      manifestPath: "-",
    })
  })

  it("reads a piped manifest from stdin", async () => {
    const reader = vi.fn()
    const readStdin = vi.fn().mockResolvedValue('{"schemaVersion":1}')

    await expect(
      readPopulationManifestText("-", reader, readStdin)
    ).resolves.toBe('{"schemaVersion":1}')
    expect(readStdin).toHaveBeenCalledOnce()
    expect(reader).not.toHaveBeenCalled()
  })
})
