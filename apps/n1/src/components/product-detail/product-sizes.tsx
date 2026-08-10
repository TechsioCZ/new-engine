import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Table } from "@techsio/ui-kit/organisms/table"
import Link from "next/link"

import type { Brand } from "@/types/product"
import type { BrandEntity } from "@/types/product-page"
import { parseBrandData } from "@/utils/helpers/parse-brand-data"

interface ProductSizesProps {
  attributes?: Brand["attributes"]
}

interface CompanyTableProps {
  caption: string
  company: BrandEntity
}

const CompanyTable = ({ caption, company }: CompanyTableProps) => (
  <div className="flex flex-col gap-150">
    <Table variant="striped">
      <Table.Caption className="text-md" style={{ fontWeight: 500 }}>
        {caption}
      </Table.Caption>
      <Table.Body>
        <Table.Row>
          <Table.Cell className="font-medium text-fg-primary">Název</Table.Cell>
          <Table.Cell>{company.name}</Table.Cell>
        </Table.Row>
        {(company.address?.length ?? 0) > 0 && (
          <Table.Row>
            <Table.Cell className="font-medium text-fg-primary">
              Adresa
            </Table.Cell>
            <Table.Cell>{company.address}</Table.Cell>
          </Table.Row>
        )}
        {(company.taxId?.length ?? 0) > 0 && (
          <Table.Row>
            <Table.Cell className="font-medium text-fg-primary">
              TAX ID
            </Table.Cell>
            <Table.Cell>{company.taxId}</Table.Cell>
          </Table.Row>
        )}
        {(company.email?.length ?? 0) > 0 && (
          <Table.Row>
            <Table.Cell className="font-medium text-fg-primary">
              Email
            </Table.Cell>
            <Table.Cell>
              <Link
                className="text-fg-primary hover:underline"
                href={`mailto:${company.email}`}
              >
                {company.email}
              </Link>
            </Table.Cell>
          </Table.Row>
        )}
        {(company.phone?.length ?? 0) > 0 && (
          <Table.Row>
            <Table.Cell className="font-medium text-fg-primary">
              Telefon
            </Table.Cell>
            <Table.Cell>{company.phone}</Table.Cell>
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  </div>
)

export const ProductSizes = ({ attributes }: ProductSizesProps) => {
  const info = parseBrandData(attributes)

  if (info === null) {
    return (
      <div className="flex items-center justify-center p-300">
        <p>Informace o výrobci nejsou k dispozici</p>
      </div>
    )
  }

  const { distributor, manufacturer, responsiblePerson, sizingGuideUrl } = info

  return (
    <div className="flex flex-col gap-300">
      {typeof sizingGuideUrl === "string" && sizingGuideUrl.length > 0 && (
        <div className="rounded-md">
          <LinkButton
            as={Link}
            className="gap-150 px-250 py-100"
            href={sizingGuideUrl}
            icon="token-icon-external-link"
          >
            Přejít na tabulku velikostí
          </LinkButton>
        </div>
      )}
      {manufacturer !== undefined && (
        <CompanyTable caption="Výrobce" company={manufacturer} />
      )}
      {responsiblePerson !== undefined && (
        <CompanyTable
          caption="Odpovědná osoba v EU"
          company={responsiblePerson}
        />
      )}
      {(distributor?.length ?? 0) > 0 && (
        <div className="rounded-md bg-surface-light p-200">
          <p className="font-medium text-fg-primary">{distributor}</p>
        </div>
      )}
    </div>
  )
}
