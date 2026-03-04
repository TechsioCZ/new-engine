import { PostAdminPplConfigSchema } from "../validators"

describe("admin ppl-config validators", () => {
  it("accepts valid optional and nullable fields", () => {
    const result = PostAdminPplConfigSchema.safeParse({
      is_enabled: true,
      client_id: "client-1",
      client_secret: null,
      default_label_format: "Pdf",
      cod_bank_account: null,
      sender_name: "Acme Sender",
      sender_street: "Main Street 12",
      sender_city: "Prague",
      sender_zip_code: "11000",
      sender_country: "CZ",
      sender_phone: "+420123456789",
      sender_email: "sender@example.com",
    })

    expect(result.success).toBe(true)
  })

  it("rejects invalid formats and too-long values", () => {
    const invalidFormat = PostAdminPplConfigSchema.safeParse({
      default_label_format: "Bmp",
      sender_email: "not-an-email",
    })

    const invalidLengths = PostAdminPplConfigSchema.safeParse({
      sender_name: "x".repeat(51),
      sender_street: "x".repeat(61),
      sender_country: "CZE1",
    })

    expect(invalidFormat.success).toBe(false)
    expect(invalidLengths.success).toBe(false)
  })
})
