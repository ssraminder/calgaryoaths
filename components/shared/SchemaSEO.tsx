interface SchemaSEOProps {
  schema: object;
}

export default function SchemaSEO({ schema }: SchemaSEOProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
