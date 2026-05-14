// Any setup scripts you might need go here

import { fileURLToPath } from "node:url"
// Load test-specific .env file
import dotenv from "dotenv"

const envPath = fileURLToPath(new URL("./test.env", import.meta.url))
dotenv.config({ path: envPath })
