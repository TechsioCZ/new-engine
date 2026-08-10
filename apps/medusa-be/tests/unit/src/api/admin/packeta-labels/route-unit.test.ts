import { beforeEach, describe, expect, it, vi } from "vitest"

import { createPacketaLabelsPdf } from "../../../../../../src/api/admin/packeta-labels/route"
import type { PacketaLabelFormat } from "../../../../../../src/modules/packeta-client/types"

const { composePacketaLabelsOnA4 } = vi.hoisted(() => ({
  composePacketaLabelsOnA4:
    vi.fn<
      (
        labelPdfs: Buffer[],
        labelOffset: number,
        labelFormat: PacketaLabelFormat | undefined,
      ) => Promise<Uint8Array>
    >(),
}))

vi.mock(
  import("../../../../../../src/api/admin/packeta-labels/label-pdf"),
  () => ({ composePacketaLabelsOnA4 }),
)

const createLabelDownloader = () => ({
  downloadLabelPdf: vi.fn<
    (
      packetId: number,
      format?: PacketaLabelFormat,
      offset?: number,
    ) => Promise<Buffer>
  >(
    async (packetId) => await Promise.resolve(Buffer.from(`label-${packetId}`)),
  ),
})

describe("Packeta label graph validation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    composePacketaLabelsOnA4.mockResolvedValue(new Uint8Array([1, 2, 3]))
  })

  it("accepts recursive JSON fulfillment data and uses only parsed label fields", async () => {
    const labelDownloader = createLabelDownloader()

    const result = await createPacketaLabelsPdf(
      [
        {
          display_id: 42,
          fulfillments: [
            {
              canceled_at: null,
              data: {
                barcode: "Z123",
                nested_provider_data: {
                  flags: [true, null, { code: "kept" }],
                },
                packet_id: 123,
              },
              id: "ful_1",
              provider_id: "packeta_packeta",
            },
          ],
          id: "order_1",
        },
      ],
      ["order_1"],
      labelDownloader,
      "A6",
      2,
    )

    expect(labelDownloader.downloadLabelPdf).toHaveBeenCalledExactlyOnceWith(
      123,
      "A6",
      0,
    )
    expect(composePacketaLabelsOnA4).toHaveBeenCalledWith(
      [Buffer.from("label-123")],
      2,
      "A6",
    )
    expect(result).toStrictEqual({
      buffer: Buffer.from([1, 2, 3]),
      filename: "packeta-label-Z123.pdf",
    })
  })

  it("preserves null data semantics as an order without a printable label", async () => {
    const labelDownloader = createLabelDownloader()

    await expect(
      createPacketaLabelsPdf(
        [
          {
            fulfillments: [
              {
                canceled_at: null,
                data: null,
                id: "ful_1",
                provider_id: "packeta_packeta",
              },
            ],
            id: "order_1",
          },
        ],
        ["order_1"],
        labelDownloader,
        undefined,
        0,
      ),
    ).rejects.toThrow("Orders without Packeta packet labels: order_1")
    expect(labelDownloader.downloadLabelPdf).not.toHaveBeenCalled()
  })

  it("rejects non-JSON values before downloading labels", async () => {
    const labelDownloader = createLabelDownloader()

    await expect(
      createPacketaLabelsPdf(
        [
          {
            fulfillments: [
              {
                canceled_at: null,
                data: {
                  packet_id: 123,
                  provider_payload: new Date("2026-01-01T00:00:00.000Z"),
                },
                id: "ful_1",
                provider_id: "packeta_packeta",
              },
            ],
            id: "order_1",
          },
        ],
        ["order_1"],
        labelDownloader,
        undefined,
        0,
      ),
    ).rejects.toThrow("Invalid input")
    expect(labelDownloader.downloadLabelPdf).not.toHaveBeenCalled()
  })
})
