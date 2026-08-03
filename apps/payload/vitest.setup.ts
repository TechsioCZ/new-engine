import { loadEnvFile } from "node:process"
import { fileURLToPath } from "node:url"

const envPath = fileURLToPath(new URL("./test.env", import.meta.url))
loadEnvFile(envPath)
