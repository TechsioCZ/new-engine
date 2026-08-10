import { MetadataStorage } from "@medusajs/framework/mikro-orm/core"
import { register } from "ts-node"

register({ transpileOnly: true })

MetadataStorage.clear()
