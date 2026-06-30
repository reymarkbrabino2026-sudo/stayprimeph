import "server-only";

export type PaymentReceiptDocumentDetails = {
  propertyTitle: string;
  propertyLocation?: string;
  propertyAddress?: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  bookingId: string;
  bookingPackageName?: string;
  hostName?: string;
  guestName?: string;
  amountPaid: number;
  paidAt?: string;
  paymentMethod: string;
  paymentStatus?: string;
  transactionId: string;
  paymentId?: string;
  receiptNumber?: string;
  invoiceNumber?: string;
  receiptNote?: string;
};

export type PaymentReceiptPdfAttachment = {
  filename: string;
  content: Buffer;
  contentType: "application/pdf";
};

const pageWidth = 612;
const pageHeight = 792;
const margin = 54;
const rightEdge = pageWidth - margin;
const brand = "0.03 0.25 0.21";
const muted = "0.42 0.42 0.42";
const border = "0.86 0.86 0.86";

function normalizePdfText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\s+/g, " ")
    .trim();
}

function pdfString(value: string) {
  return normalizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function formatPdfCurrency(value: number) {
  return `PHP ${new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 }).format(value)}`;
}

function formatPdfDate(value?: string) {
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) return normalizePdfText(value ?? "");
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

function bookingCode(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

function receiptNumber(input: PaymentReceiptDocumentDetails) {
  return input.receiptNumber ?? bookingCode(input.bookingId);
}

function invoiceNumber(input: PaymentReceiptDocumentDetails) {
  return input.invoiceNumber ?? `SPH-${bookingCode(input.bookingId)}`;
}

function paymentMethodLabel(method: string) {
  if (method === "gcash") return "GCash";
  if (method === "bank_transfer") return "Bank transfer";
  if (method === "stripe") return "Stripe";
  if (method === "cash_balance") return "Cash at check-in";
  return "Other";
}

function fileSafe(value: string) {
  return normalizePdfText(value).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "StayPrimePH";
}

function text(x: number, y: number, value: string, size = 10, bold = false, color = "0 0 0") {
  return `${color} rg BT /${bold ? "F2" : "F1"} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${pdfString(value)}) Tj ET`;
}

function textRight(right: number, y: number, value: string, size = 10, bold = false, color = "0 0 0") {
  const clean = normalizePdfText(value);
  const width = clean.length * size * 0.48;
  return text(right - width, y, clean, size, bold, color);
}

function line(x1: number, y1: number, x2: number, y2: number, color = border) {
  return `${color} RG 0.7 w ${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`;
}

function rect(x: number, y: number, width: number, height: number, color: string, fill = true) {
  return `${color} ${fill ? "rg" : "RG"} ${x.toFixed(2)} ${y.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re ${fill ? "f" : "S"}`;
}

function wrapText(value: string, maxLength: number) {
  const words = normalizePdfText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function detailRow(commands: string[], y: number, label: string, value: string, bold = false) {
  commands.push(text(margin, y, label, 10, false, muted));
  commands.push(textRight(rightEdge, y, value, 10, bold));
  commands.push(line(margin, y - 10, rightEdge, y - 10));
}

function paymentSummary(input: PaymentReceiptDocumentDetails) {
  const paidInFull = input.paymentStatus === "paid" || input.amountPaid >= input.totalPrice;
  const remainingBalance = paidInFull ? 0 : Math.max(input.totalPrice - input.amountPaid, 0);
  return {
    paidInFull,
    remainingBalance,
    status: paidInFull ? "Paid" : "Partially paid",
  };
}

function addHeader(commands: string[], title: string, subtitle: string) {
  commands.push(text(margin, 736, "StayPrimePH", 18, true, brand));
  commands.push(text(margin, 710, title, 28, true));
  commands.push(text(margin, 690, subtitle, 11, false, muted));
  commands.push(line(margin, 672, rightEdge, 672));
}

function addFooter(commands: string[]) {
  commands.push(line(margin, 64, rightEdge, 64));
  commands.push(text(margin, 44, "Sent with care from StayPrimePH", 9, false, muted));
  commands.push(textRight(rightEdge, 44, "support@stayprimeph.com", 9, false, muted));
}

function buildReceiptCommands(input: PaymentReceiptDocumentDetails) {
  const commands: string[] = [];
  const receipt = receiptNumber(input);
  const invoice = invoiceNumber(input);
  const summary = paymentSummary(input);
  const stay = `${formatPdfDate(input.checkIn)} - ${formatPdfDate(input.checkOut)}`;
  const description = input.bookingPackageName ?? input.propertyTitle;

  addHeader(commands, `Receipt #${receipt}`, `Payment ${summary.status.toLowerCase()} on ${formatPdfDate(input.paidAt)}`);
  commands.push(rect(margin, 592, rightEdge - margin, 56, "0.94 0.98 0.96"));
  commands.push(text(margin + 18, 624, "Amount paid", 10, false, muted));
  commands.push(text(margin + 18, 604, formatPdfCurrency(input.amountPaid), 24, true, brand));
  commands.push(textRight(rightEdge - 18, 624, summary.status, 12, true, brand));
  commands.push(textRight(rightEdge - 18, 604, paymentMethodLabel(input.paymentMethod), 10));

  let y = 552;
  detailRow(commands, y, "Receipt number", receipt, true);
  y -= 28;
  detailRow(commands, y, "Invoice number", invoice);
  y -= 28;
  detailRow(commands, y, "Payment reference", input.transactionId);
  y -= 28;
  detailRow(commands, y, "Booking", description, true);
  y -= 28;
  detailRow(commands, y, "Stay", stay);
  y -= 28;
  detailRow(commands, y, "Guests", String(input.guests));
  y -= 28;
  detailRow(commands, y, "Booking total", formatPdfCurrency(input.totalPrice), true);
  y -= 28;
  if (summary.remainingBalance > 0) {
    detailRow(commands, y, "Remaining balance", formatPdfCurrency(summary.remainingBalance), true);
    y -= 28;
  }

  if (input.receiptNote) {
    commands.push(text(margin, y - 8, "Note", 10, true));
    const lines = wrapText(input.receiptNote, 82);
    lines.slice(0, 3).forEach((item, index) => commands.push(text(margin, y - 26 - index * 14, item, 9, false, muted)));
  }

  addFooter(commands);
  return commands;
}

function buildInvoiceCommands(input: PaymentReceiptDocumentDetails) {
  const commands: string[] = [];
  const invoice = invoiceNumber(input);
  const summary = paymentSummary(input);
  const description = input.bookingPackageName ?? input.propertyTitle;
  const addressLines = wrapText(input.propertyAddress ?? input.propertyLocation ?? "Address shared after confirmation", 70);

  addHeader(commands, `Invoice #${invoice}`, `Reservation code ${bookingCode(input.bookingId)}`);

  commands.push(text(margin, 638, "Bill to", 10, true));
  commands.push(text(margin, 620, input.guestName ?? "StayPrimePH guest", 10));
  commands.push(text(margin, 602, input.propertyTitle, 10, true));
  addressLines.slice(0, 2).forEach((item, index) => commands.push(text(margin, 584 - index * 14, item, 9, false, muted)));

  commands.push(textRight(rightEdge, 638, `Invoice date: ${formatPdfDate(input.paidAt)}`, 10));
  commands.push(textRight(rightEdge, 620, `Status: ${summary.status}`, 10, true, brand));
  commands.push(textRight(rightEdge, 602, `Host: ${input.hostName ?? "StayPrimePH host"}`, 10));

  commands.push(line(margin, 536, rightEdge, 536));
  commands.push(text(margin, 516, "Description", 10, true, muted));
  commands.push(textRight(430, 516, "Qty", 10, true, muted));
  commands.push(textRight(rightEdge, 516, "Amount", 10, true, muted));
  commands.push(line(margin, 502, rightEdge, 502));
  commands.push(text(margin, 478, description, 11, true));
  commands.push(text(margin, 460, `${formatPdfDate(input.checkIn)} - ${formatPdfDate(input.checkOut)} | ${input.guests} guest${input.guests === 1 ? "" : "s"}`, 9, false, muted));
  commands.push(textRight(430, 478, "1", 10));
  commands.push(textRight(rightEdge, 478, formatPdfCurrency(input.totalPrice), 10, true));
  commands.push(line(margin, 436, rightEdge, 436));

  detailRow(commands, 408, "Subtotal", formatPdfCurrency(input.totalPrice), true);
  detailRow(commands, 380, "Amount paid", formatPdfCurrency(input.amountPaid), true);
  if (summary.remainingBalance > 0) {
    detailRow(commands, 352, "Balance due", formatPdfCurrency(summary.remainingBalance), true);
  } else {
    detailRow(commands, 352, "Balance due", formatPdfCurrency(0), true);
  }

  commands.push(text(margin, 304, "Payment method", 10, true));
  commands.push(text(margin, 286, paymentMethodLabel(input.paymentMethod), 10));
  commands.push(text(margin, 268, `Reference: ${input.transactionId}`, 9, false, muted));

  addFooter(commands);
  return commands;
}

function createPdf(commands: string[]) {
  const content = ["q", ...commands, "Q"].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(content, "ascii")} >>\nstream\n${content}\nendstream`,
  ];

  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(output, "ascii"));
    output += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(output, "ascii");
  output += `xref\n0 ${objects.length + 1}\n`;
  output += "0000000000 65535 f \n";
  for (const offset of offsets.slice(1)) {
    output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(output, "ascii");
}

export function generatePaymentReceiptPdf(input: PaymentReceiptDocumentDetails) {
  return createPdf(buildReceiptCommands(input));
}

export function generatePaymentInvoicePdf(input: PaymentReceiptDocumentDetails) {
  return createPdf(buildInvoiceCommands(input));
}

export function buildPaymentReceiptPdfAttachments(input: PaymentReceiptDocumentDetails): PaymentReceiptPdfAttachment[] {
  const receipt = receiptNumber(input);
  const invoice = invoiceNumber(input);
  return [
    {
      filename: `Receipt-${fileSafe(receipt)}.pdf`,
      content: generatePaymentReceiptPdf(input),
      contentType: "application/pdf",
    },
    {
      filename: `Invoice-${fileSafe(invoice)}.pdf`,
      content: generatePaymentInvoicePdf(input),
      contentType: "application/pdf",
    },
  ];
}
