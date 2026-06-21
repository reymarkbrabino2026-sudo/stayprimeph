// Renders a schema.org JSON-LD <script>. The "<" escape prevents any
// user-supplied field (listing title/description) from breaking out of the
// script tag.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
