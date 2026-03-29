import { LinkButton } from "@techsio/ui-kit/atoms/link-button"
import { Table } from "@techsio/ui-kit/organisms/table"
import Link from "next/link"
import type { Producer } from "@/types/product"
import type { ParsedProducerInfo } from "@/types/product-page"
import { parseProducerData } from "@/utils/helpers/parse-producer-data"

type ProductSizesProps = {
  attributes?: Producer["attributes"]
}

export function ProductSizes({ attributes }: ProductSizesProps) {
  const info: ParsedProducerInfo | null = parseProducerData(attributes)

  if (!info) {
    return (
      <div className="flex items-center justify-center p-300">
        <p>Informace o výrobci nejsou k dispozici</p>
      </div>
    )
  }

  const { sizingGuideUrl, manufacturer, responsiblePerson, distributor } = info

  return (
    <div className="flex flex-col gap-300">
      {sizingGuideUrl && (
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

      {manufacturer && (
        <div className="flex flex-col gap-150">
          <Table variant="striped">
            <Table.Caption className="text-md" style={{ fontWeight: 500 }}>
              Výrobce
            </Table.Caption>
            <Table.Body>
              <Table.Row>
                <Table.Cell className="font-medium text-fg-primary">
                  Název
                </Table.Cell>
                <Table.Cell>{manufacturer.name}</Table.Cell>
              </Table.Row>

              {manufacturer.address && (
                <Table.Row>
                  <Table.Cell className="font-medium text-fg-primary">
                    Adresa
                  </Table.Cell>
                  <Table.Cell>{manufacturer.address}</Table.Cell>
                </Table.Row>
              )}

              {manufacturer.taxId && (
                <Table.Row>
                  <Table.Cell className="font-medium text-fg-primary">
                    TAX ID
                  </Table.Cell>
                  <Table.Cell>{manufacturer.taxId}</Table.Cell>
                </Table.Row>
              )}

              {manufacturer.email && (
                <Table.Row>
                  <Table.Cell className="font-medium text-fg-primary">
                    Email
                  </Table.Cell>
                  <Table.Cell>
                    <Link
                      className="text-fg-primary hover:underline"
                      href={`mailto:${manufacturer.email}`}
                    >
                      {manufacturer.email}
                    </Link>
                  </Table.Cell>
                </Table.Row>
              )}

              {manufacturer.phone && (
                <Table.Row>
                  <Table.Cell className="font-medium text-fg-primary">
                    Telefon
                  </Table.Cell>
                  <Table.Cell>{manufacturer.phone}</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </div>
      )}

      {responsiblePerson && (
        <div className="flex flex-col gap-150">
          <Table variant="striped">
            <Table.Caption className="text-md" style={{ fontWeight: 500 }}>
              Odpovědná osoba v EU
            </Table.Caption>
            <Table.Body>
              <Table.Row>
                <Table.Cell className="font-medium text-fg-primary">
                  Název
                </Table.Cell>
                <Table.Cell>{responsiblePerson.name}</Table.Cell>
              </Table.Row>

              {responsiblePerson.address && (
                <Table.Row>
                  <Table.Cell className="font-medium text-fg-primary">
                    Adresa
                  </Table.Cell>
                  <Table.Cell>{responsiblePerson.address}</Table.Cell>
                </Table.Row>
              )}

              {responsiblePerson.taxId && (
                <Table.Row>
                  <Table.Cell className="font-medium text-fg-primary">
                    TAX ID
                  </Table.Cell>
                  <Table.Cell>{responsiblePerson.taxId}</Table.Cell>
                </Table.Row>
              )}

              {responsiblePerson.email && (
                <Table.Row>
                  <Table.Cell className="font-medium text-fg-primary">
                    Email
                  </Table.Cell>
                  <Table.Cell>
                    <Link
                      className="text-fg-primary hover:underline"
                      href={`mailto:${responsiblePerson.email}`}
                    >
                      {responsiblePerson.email}
                    </Link>
                  </Table.Cell>
                </Table.Row>
              )}

              {responsiblePerson.phone && (
                <Table.Row>
                  <Table.Cell className="font-medium text-fg-primary">
                    Telefon
                  </Table.Cell>
                  <Table.Cell>{responsiblePerson.phone}</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table>
        </div>
      )}

      {distributor && (
        <div className="rounded-md bg-surface-light p-200">
          <p className="font-medium text-fg-primary">{distributor}</p>
        </div>
      )}
    </div>
  )
}
