import { MedusaError } from "@medusajs/framework/utils"
import { afterEach, describe, expect, it, vi } from "vitest"

import { PacketaClient } from "../client"

const createClient = () =>
  new PacketaClient({
    api_password: "test-value",
    default_label_format: "A6",
    default_label_offset: 0,
    environment: "testing",
  })

const branch = {
  branchType: "zbox",
  city: "Praha",
  country: "cz",
  currency: "CZK",
  id: 12,
  latitude: "50.0755",
  longitude: "14.4378",
  name: "Packeta Praha",
  nameStreet: "Packeta Praha, Dlouhá 1",
  openingHours: "Po-Pá 08:00-18:00",
  street: "Dlouhá 1",
  zip: "11000",
}

describe("PacketaClient response parsing", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns the decoded create-packet result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          await Promise.resolve(
            new Response(
              "<response><status>ok</status><result><id>123</id><barcode>Z123</barcode><barcodeText>Z 123</barcodeText><ignored>remove me</ignored></result></response>",
              { status: 200 },
            ),
          ),
      ),
    )

    const result = await createClient().createPacket({
      addressId: 12,
      currency: "CZK",
      name: "Jan",
      number: "order-1",
      surname: "Novák",
      value: 100,
    })

    expect(result).toStrictEqual({
      barcode: "Z123",
      barcodeText: "Z 123",
      id: 123,
    })
  })

  it("rejects create-packet results without barcodeText", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          await Promise.resolve(
            new Response(
              "<response><status>ok</status><result><id>123</id><barcode>Z123</barcode></result></response>",
              { status: 200 },
            ),
          ),
      ),
    )

    await expect(
      createClient().createPacket({
        addressId: 12,
        currency: "CZK",
        name: "Jan",
        number: "order-1",
        surname: "Novák",
        value: 100,
      }),
    ).rejects.toThrow(MedusaError)
  })

  it("decodes packet tracking records and maps their statuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          await Promise.resolve(
            new Response(
              "<response><status>ok</status><result><record><dateTime>2026-01-02T03:04:05Z</dateTime><statusCode>7</statusCode><statusName>Delivered</statusName></record></result></response>",
              { status: 200 },
            ),
          ),
      ),
    )

    await expect(createClient().packetStatus(123)).resolves.toStrictEqual([
      {
        dateTime: "2026-01-02T03:04:05Z",
        state: "delivered",
        statusCode: 7,
        statusName: "Delivered",
      },
    ])
  })

  it("returns an empty tracking history when record is undefined", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          await Promise.resolve(
            new Response(
              "<response><status>ok</status><result><ignored>remove me</ignored></result></response>",
              { status: 200 },
            ),
          ),
      ),
    )

    await expect(createClient().packetStatus(123)).resolves.toStrictEqual([])
  })

  it("rejects packet tracking records with invalid fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          await Promise.resolve(
            new Response(
              "<response><status>ok</status><result><record><dateTime>2026-01-02T03:04:05Z</dateTime><statusName>Delivered</statusName></record></result></response>",
              { status: 200 },
            ),
          ),
      ),
    )

    await expect(createClient().packetStatus(123)).rejects.toThrow(MedusaError)
  })

  it("decodes every known branch field and removes unknown feed fields", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          await Promise.resolve(
            Response.json({
              data: {
                branches: [{ ...branch, ignored: "remove me" }],
              },
            }),
          ),
      ),
    )

    await expect(createClient().getBranchList()).resolves.toStrictEqual([
      branch,
    ])
  })
})
