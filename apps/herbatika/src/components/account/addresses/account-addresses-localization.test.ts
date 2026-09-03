import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const MESSAGE_FILES = {
  sk: "sk-SK.json",
  cz: "cs-CZ.json",
  hu: "hu-HU.json",
  ro: "ro-RO.json",
} as const

const readMessages = (fileName: string) =>
  JSON.parse(
    readFileSync(
      resolve(
        process.cwd(),
        "../medusa-be/src/modules/storefront-text/messages",
        fileName
      ),
      "utf8"
    )
  )

describe("saved-address localization", () => {
  const messages = Object.fromEntries(
    Object.entries(MESSAGE_FILES).map(([market, fileName]) => [
      market,
      readMessages(fileName),
    ])
  )

  it("keeps the complete address key set in exact four-market parity", () => {
    const expectedKeys = Object.keys(messages.sk.auth.account.addresses).sort()

    for (const market of Object.keys(MESSAGE_FILES)) {
      expect(
        Object.keys(messages[market].auth.account.addresses).sort()
      ).toEqual(expectedKeys)
      expect(messages[market].auth.account.addresses.title).toBeTruthy()
    }
  })

  it("provides native Romanian labels and CRUD feedback", () => {
    const account = messages.ro.auth.account

    expect(account.addresses.title).toBe("Adrese salvate")
    expect(account.addresses.default_shipping).toBe(
      "Adresă de livrare implicită"
    )
    expect(account.addresses.updated).toBe("Adresa a fost actualizată.")
    expect(account.addresses.delete_title).toBe("Ștergeți adresa?")
  })

  it("does not reuse Slovak address actions in Romanian", () => {
    const romanian = JSON.stringify(messages.ro.auth.account.addresses)

    expect(romanian).not.toContain("Uložiť")
    expect(romanian).not.toContain("Odstrániť")
    expect(romanian).not.toContain("Skúsiť")
  })
})
