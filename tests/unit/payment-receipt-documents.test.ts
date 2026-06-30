import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildPaymentReceiptPdfAttachments, generatePaymentInvoicePdf, generatePaymentReceiptPdf } from "@/lib/payment-receipt-documents";

const details = {
  propertyTitle: "Caya Villa",
  propertyLocation: "Tagaytay, Philippines",
  propertyAddress: "123 Prime Street",
  checkIn: "2026-07-10",
  checkOut: "2026-07-12",
  guests: 2,
  totalPrice: 6000,
  bookingId: "booking-1",
  bookingPackageName: "Overnight Full Access",
  hostName: "Host One",
  guestName: "Guest One",
  amountPaid: 6000,
  paidAt: "2026-06-29T06:30:00.000Z",
  paymentMethod: "gcash",
  paymentStatus: "paid",
  transactionId: "GCASH-REF-12345",
  receiptNumber: "BOOK-ING1",
  invoiceNumber: "SPH-BOOK-ING1",
};

describe("payment receipt PDF documents", () => {
  it("generates valid-looking PDF buffers for receipts and invoices", () => {
    const receipt = generatePaymentReceiptPdf(details);
    const invoice = generatePaymentInvoicePdf(details);

    expect(receipt.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(invoice.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(receipt.toString("ascii")).toContain("Receipt #BOOK-ING1");
    expect(invoice.toString("ascii")).toContain("Invoice #SPH-BOOK-ING1");
    expect(invoice.toString("ascii")).toContain("Overnight Full Access");
  });

  it("builds receipt and invoice attachments with stable filenames", () => {
    const attachments = buildPaymentReceiptPdfAttachments(details);

    expect(attachments).toHaveLength(2);
    expect(attachments[0]).toMatchObject({
      filename: "Receipt-BOOK-ING1.pdf",
      contentType: "application/pdf",
    });
    expect(attachments[1]).toMatchObject({
      filename: "Invoice-SPH-BOOK-ING1.pdf",
      contentType: "application/pdf",
    });
    expect(attachments[0].content.subarray(0, 5).toString("ascii")).toBe("%PDF-");
    expect(attachments[1].content.subarray(0, 5).toString("ascii")).toBe("%PDF-");
  });
});
