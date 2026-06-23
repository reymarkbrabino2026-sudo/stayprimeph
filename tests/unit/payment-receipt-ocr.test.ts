import { describe, expect, it } from "vitest";
import { extractPaymentReferenceFromReceiptText } from "@/lib/payment-receipt-ocr";

describe("extractPaymentReferenceFromReceiptText", () => {
  it("extracts a labeled GCash reference number", () => {
    expect(extractPaymentReferenceFromReceiptText(`
      You sent PHP 9,000.00
      Ref No. 1234 5678 9012
      Mobile No. 09171234567
    `)).toBe("123456789012");
  });

  it("extracts a labeled transaction ID with letters", () => {
    expect(extractPaymentReferenceFromReceiptText("Transaction ID: BDO-9876-ABCD-321")).toBe("BDO-9876-ABCD-321");
  });

  it("falls back to the longest numeric reference while skipping phone-shaped values", () => {
    expect(extractPaymentReferenceFromReceiptText(`
      Paid from 09171234567
      0044 9988 7766 55
      Amount 9000
    `)).toBe("00449988776655");
  });

  it("returns an empty string when no likely reference exists", () => {
    expect(extractPaymentReferenceFromReceiptText("Amount PHP 9000 paid today")).toBe("");
  });
});
