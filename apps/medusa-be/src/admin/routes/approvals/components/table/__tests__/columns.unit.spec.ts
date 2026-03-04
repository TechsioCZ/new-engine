import React from "react"

describe("useApprovalsTableColumns", () => {
  it("builds columns and renders key cell components", () => {
    let useApprovalsTableColumns: () => any[]

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

      jest.doMock("@medusajs/ui", () => {
        const React = jest.requireActual("react")
        return {
          StatusBadge: ({ children, ...props }: any) =>
            React.createElement("status-badge", props, children),
        }
      })

      jest.doMock(
        "../../../../../../admin/components/common/table/table-cells/date-cell",
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

      jest.doMock("../../approval-actions", () => ({
        ApprovalActions: ({ cart }: any) =>
          ({ type: "ApprovalActions", props: { cart } }) as any,
      }))

      jest.doMock("../../approvals-items-popover", () => ({
        __esModule: true,
        default: ({ items, currencyCode }: any) =>
          ({ type: "ItemsPopover", props: { items, currencyCode } }) as any,
      }))

      useApprovalsTableColumns = require("../columns").useApprovalsTableColumns
    })

    const columns = useApprovalsTableColumns!()
    const { ApprovalStatusType } = require("../../../../../../types/approval")

    expect(columns).toHaveLength(6)

    const idCell = columns[0].cell({
      getValue: () => "approval_1234",
    })
    expect(idCell.props.text).toBe("#1234")

    const pending = columns[3].cell({
      getValue: () => ApprovalStatusType.PENDING,
    })
    const approved = columns[3].cell({
      getValue: () => ApprovalStatusType.APPROVED,
    })
    const rejected = columns[3].cell({
      getValue: () => ApprovalStatusType.REJECTED,
    })

    expect(pending.props.color).toBe("purple")
    expect(pending.props.children).toBe("Pending")
    expect(approved.props.color).toBe("green")
    expect(rejected.props.color).toBe("red")

    const itemsCell = columns[4].cell({
      getValue: () => [{ id: "item_1" }],
      row: { original: { currency_code: "usd" } },
    })
    expect(itemsCell.props.currencyCode).toBe("usd")

    const actionsCell = columns[5].cell({
      row: { original: { id: "cart_1" } },
    })
    expect(actionsCell.props.cart).toEqual({ id: "cart_1" })
  })
})
