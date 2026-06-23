const labeledReferencePatterns = [
  /(?:ref(?:erence)?(?:\s*(?:no\.?|number|#))?|transaction\s*(?:id|no\.?|number)|receipt\s*(?:no\.?|number)|trace\s*(?:id|no\.?))\s*[:#-]?\s*([a-z0-9][a-z0-9\s-]{5,40})/i,
  /(?:gcash|maya|bank)\s*(?:ref(?:erence)?|transaction)\s*(?:no\.?|number|id)?\s*[:#-]?\s*([a-z0-9][a-z0-9\s-]{5,40})/i,
];

function cleanReferenceCandidate(value: string) {
  return value
    .replace(/[^\da-z-]/gi, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
}

function isLikelyReference(value: string) {
  const alphanumeric = value.replace(/[^a-z0-9]/gi, "");
  if (alphanumeric.length < 6 || alphanumeric.length > 32) return false;
  if (/^09\d{9}$/.test(alphanumeric)) return false;
  if (/^9\d{9}$/.test(alphanumeric)) return false;
  return /\d/.test(alphanumeric);
}

export function extractPaymentReferenceFromReceiptText(text: string) {
  const lines = text
    .replace(/\u00a0/g, " ")
    .replace(/[|]/g, "1")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  for (const line of lines) {
    for (const pattern of labeledReferencePatterns) {
      const match = line.match(pattern);
      const candidate = match?.[1] ? cleanReferenceCandidate(match[1]) : "";
      if (candidate && isLikelyReference(candidate)) return candidate;
    }
  }

  const numericCandidates = lines
    .flatMap((line) => Array.from(line.matchAll(/\b\d[\d\s-]{7,24}\d\b/g)))
    .map((match) => cleanReferenceCandidate(match[0]))
    .filter(isLikelyReference)
    .sort((a, b) => b.replace(/\D/g, "").length - a.replace(/\D/g, "").length);

  return numericCandidates[0] ?? "";
}
