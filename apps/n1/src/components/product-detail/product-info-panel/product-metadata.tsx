type MetadataRows = {
  label: string
  value?: string | number | undefined
}

export const ProductMetadata = ({ rows }: { rows: MetadataRows[] }) => (
  <div className="text-secondary">
    {rows.map((row) => (
      <div className="flex justify-between" key={row.label}>
        <span>{row.label}</span>
        <span>{row.value || "—"}</span>
      </div>
    ))}
  </div>
)
