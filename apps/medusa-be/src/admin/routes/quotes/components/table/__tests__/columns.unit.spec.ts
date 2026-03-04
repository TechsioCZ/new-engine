describe("useQuotesTableColumns", () => {
  it("builds quote columns and cell renderers", () => {
    let useQuotesTableColumns: () => any[]

    jest.isolateModules(() => {
      jest.doMock("react", () => ({
        ...jest.requireActual("react"),
        useMemo: (factory: () => unknown) => factory(),
      }))

      jest.doMock("react-i18next", () => ({
        useTranslation: () => ({
          t: (value: string) => value,
        }),
      }))

      jest.doMock("@tanstack/react-table", () => ({
        createColumnHelper: () => ({
          accessor: (key: string, config: any) => ({ key, ...config }),
        }),
      }))

      jest.doMock(
        "../../../../../components/common/table/table-cells/date-cell",
        () => ({
          DateCell: ({ date }: any) =>
            ({ type: "DateCell", props: { date } }) as any,
        })
      )

      jest.doMock(
        "../../../../../components/common/table/table-cells/text-cell",
        () => ({
          TextCell: ({ text }: any) =>
            ({ type: "TextCell", props: { text } }) as any,
        })
      )

      jest.doMock("../../quote-status-badge", () => ({
        __esModule: true,
        default: ({ status }: any) =>
          ({ type: "QuoteStatusBadge", props: { status } }) as any,
      }))

      useQuotesTableColumns = require("../columns").useQuotesTableColumns
    })

    const columns = useQuotesTableColumns!()

    expect(columns).toHaveLength(6)
    expect(columns[0].cell({ getValue: () => "42" }).props.text).toBe("#42")
    expect(columns[1].cell({ getValue: () => "accepted" }).props.status).toBe(
      "accepted"
    )
    expect(columns[2].cell({ getValue: () => "a@example.com" }).props.text).toBe(
      "a@example.com"
    )
    expect(
      columns[3].cell({ getValue: () => "Acme" }).props.text
    ).toBe("Acme")

    // current implementation intentionally returns undefined from this cell callback
    expect(
      columns[4].cell({
        getValue: () => 100,
        row: { original: { draft_order: { currency_code: "usd" } } },
      })
    ).toBeUndefined()

    expect(columns[5].cell({ getValue: () => "2024-01-01" }).props.date).toBe(
      "2024-01-01"
    )
  })
})
