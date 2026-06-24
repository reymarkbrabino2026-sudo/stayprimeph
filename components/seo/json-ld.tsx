// Renders a schema.org JSON-LD <script>. The "<" escape prevents any
// user-supplied field (listing title/description) from breaking out of the
// script tag.
export function JsonLd({ data, nonce }: { data: Record<string, unknown> | Record<string, unknown>[]; nonce?: string }) {
  return <script type="application/ld+json" nonce={nonce}>{JSON.stringify(data).replace(/</g, "\\u003c")}</script>;
}
