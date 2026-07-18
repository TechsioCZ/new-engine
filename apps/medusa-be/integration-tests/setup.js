const { register } = require("ts-node")

register({ transpileOnly: true })

const { MetadataStorage } = require("@medusajs/framework/mikro-orm/core")

MetadataStorage.clear()
