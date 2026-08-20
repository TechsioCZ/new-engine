import { writeFile } from "node:fs/promises"

export const writePrivateJsonOutput = async (outputPath, value) =>
  writeFile(outputPath, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  })
