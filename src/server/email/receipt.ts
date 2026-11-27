import "server-only";
import { z } from "zod";

export const receiptSchema = z.object({
  receipt_number: z.string().regex(/^LNA-R-[A-Z0-9-]+$/),
  public_ref: z.string(),
  full_name: z.string(),
  course_title: z.string(),
  batch_name: z.string(),
  confirmed_at: z.string().datetime({ offset: true }),
  collected_poisha: z.string().regex(/^[1-9]\d*$/),
  payment_method: z.enum(["bkash", "bank_transfer", "cash"]),
  is_test: z.boolean(),
});
export type Receipt = z.infer<typeof receiptSchema>;

export function receiptFilename(receipt: Receipt) {
  return `${receipt.receipt_number}.pdf`;
}

// The built-in PDF font covers ASCII. Never transliterate an applicant's identity incorrectly.
// The exact Unicode name and course remain in the accompanying confirmation email and database.
function printable(value: string) {
  return /^[\x20-\x7e]+$/.test(value) ? value : "See registration record for original text";
}

function pdfText(value: string) {
  return value.replace(/([\\()])/g, "\\$1");
}

function wrap(value: string, width = 46): string[] {
  const text = printable(value);
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    if (line && line.length + word.length + 1 > width) {
      lines.push(line);
      line = "";
    }
    for (let offset = 0; offset < word.length; offset += width) {
      const part = word.slice(offset, offset + width);
      if (offset > 0 || (line && line.length + part.length + 1 > width)) {
        if (line) lines.push(line);
        line = part;
      } else {
        line += `${line ? " " : ""}${part}`;
      }
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Deterministic, single-page PDF. No browser, network, or additional runtime dependency. */
export function renderPaymentReceipt(input: Receipt): Buffer {
  const receipt = receiptSchema.parse(input);
  const amount = BigInt(receipt.collected_poisha);
  const money = `${(amount / 100n).toLocaleString("en-US")}.${String(amount % 100n).padStart(2, "0")}`;
  const date = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(receipt.confirmed_at));
  const lines: string[] = [];
  const write = (text: string, x: number, y: number, size: number, bold = false) => {
    lines.push(
      `BT /${bold ? "F2" : "F1"} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${pdfText(text)}) Tj ET`
    );
  };
  lines.push("0.03 0.39 0.47 rg 0 715 595 127 re f", "1 1 1 rg");
  write("LEAD NATION ACADEMY", 44, 794, 15, true);
  write(receipt.is_test ? "TEST PAYMENT RECEIPT" : "PAYMENT RECEIPT", 44, 751, 25, true);
  lines.push("0.09 0.18 0.21 rg");
  let y = 675;
  const fields = [
    ["Receipt number", receipt.receipt_number],
    ["Application reference", receipt.public_ref],
    ["Student", receipt.full_name],
    ["Course", receipt.course_title],
    ["Batch", receipt.batch_name],
    ["Confirmed (Bangladesh time)", date.replace(/[^\x20-\x7e]/g, " ")],
    [
      "Payment method",
      { bkash: "bKash", bank_transfer: "Bank transfer", cash: "Cash" }[receipt.payment_method],
    ],
  ];
  for (const [label, value] of fields) {
    write(label, 44, y, 10, true);
    y -= 15;
    const wrapped = wrap(value);
    for (const [index, part] of wrapped.slice(0, 4).entries()) {
      write(index === 3 && wrapped.length > 4 ? `${part.slice(0, 42)} ...` : part, 44, y, 10);
      y -= 13;
    }
    y -= 8;
  }
  y = Math.max(y - 10, 110);
  lines.push(`0.92 0.97 0.97 rg 44 ${y - 54} 507 65 re f`, "0.03 0.39 0.47 rg");
  write("AMOUNT RECEIVED", 58, y - 10, 10, true);
  write(`BDT ${money}`, 58, y - 36, 20, true);
  lines.push("0.09 0.18 0.21 rg");
  write(
    receipt.is_test
      ? "Test record only. Not evidence of real funds."
      : "Issued for a confirmed enrollment and recorded payment.",
    44,
    34,
    9
  );
  const stream = lines.join("\n") + "\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`,
  ];
  let file = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(file));
    file += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(file);
  file += `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) file += `${String(offset).padStart(10, "0")} 00000 n \n`;
  file += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(file, "ascii");
}
