import "server-only";

/**
 * Lead Nation Academy payment receipt (A4 PDF).
 * The renderer embeds the supplied full logo and font subsets from receipt-assets.
 * Server-side renderer using the approved LNA artwork and typefaces.
 *
 *   const pdf = renderReceipt(data);   // Uint8Array
 *
 * Fonts: Inter and Crimson Text (subsets), SIL Open Font License 1.1.
 */

/**
 * @typedef {Object} ReceiptData
 * @property {string} receiptNumber
 * @property {string} applicationReference
 * @property {string} studentName
 * @property {string} courseName
 * @property {string} batch
 * @property {string} confirmedAt  Saved payment confirmation timestamp.
 * @property {string} issuedAt  Saved original receipt issue timestamp.
 * @property {string} issuerEmail
 * @property {string} issuerDomain
 * @property {boolean} isTest
 * @property {string} paymentMethod
 * @property {string} collectedPoisha
 * @property {string} [transactionId]   Verified gateway transaction ID.
 * @property {string} [paymentReference]   Reference recorded by staff.
 * @property {{ basePoisha: string, reductionPoisha: string, label: string }} [feeBreakdown]
 * @property {string[]} [notes]           Replaces DEFAULT_NOTES. Up to 4, two short lines each.
 */

import ASSETS from "./receipt-assets/design.json" with { type: "json" };

/** Printed under "Please note". Edit to match the academy's own policy. */
const DEFAULT_NOTES = [
  "Keep this receipt safe. It is your record of this payment.",
  "Quote the receipt number in any query about this payment.",
  "This receipt covers only the amount shown on it.",
  "Check your name, course and batch, and report any error to the academy.",
];

const PAGE_W = 595.28,
  PAGE_H = 841.89;
const L = 52,
  R = PAGE_W - 52,
  W = R - L;

const INK = "#101a2e"; // logo navy
const TEAL = "#1d5f78"; // logo laurel
const MUTED = "#566074";
const LINE = "#d5dae2";
const TINT = "#f4f6f8";
const ON_INK = "#c3cedd";

// WinAnsi code points 0x80-0x9F that differ from Latin-1.
const WIN_ANSI = {
  0x20ac: 128,
  0x201a: 130,
  0x0192: 131,
  0x201e: 132,
  0x2026: 133,
  0x2020: 134,
  0x2021: 135,
  0x02c6: 136,
  0x2030: 137,
  0x0160: 138,
  0x2039: 139,
  0x0152: 140,
  0x017d: 142,
  0x2018: 145,
  0x2019: 146,
  0x201c: 147,
  0x201d: 148,
  0x2022: 149,
  0x2013: 150,
  0x2014: 151,
  0x02dc: 152,
  0x2122: 153,
  0x0161: 154,
  0x203a: 155,
  0x0153: 156,
  0x017e: 158,
  0x0178: 159,
};

function encode(text) {
  const out = [];
  for (const ch of text) {
    const c = ch.codePointAt(0);
    if ((c >= 32 && c <= 126) || (c >= 160 && c <= 255)) out.push(c);
    else if (WIN_ANSI[c]) out.push(WIN_ANSI[c]);
    else throw new Error("RECEIPT_UNSUPPORTED_CHARACTER");
  }
  return out;
}

const widthOf = (text, font, size) =>
  (encode(text).reduce((sum, c) => sum + ASSETS.fonts[font].widths[c - 32], 0) * size) / 1000;

const fitSize = (text, font, size, max) => {
  const w = widthOf(text, font, size);
  return w > max ? (size * max) / w : size;
};

function wrap(text, font, size, max, maxLines) {
  const lines = [];
  let line = "";
  for (let word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (widthOf(next, font, size) <= max) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    while (widthOf(word, font, size) > max) {
      let n = word.length - 1;
      while (n > 1 && widthOf(word.slice(0, n), font, size) > max) n--;
      lines.push(word.slice(0, n));
      word = word.slice(n);
    }
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    lines.length = maxLines;
    let last = lines[maxLines - 1];
    while (widthOf(`${last}…`, font, size) > max) last = last.slice(0, -1);
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

function required(data, key) {
  const value = String(data[key] ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) throw new Error(`Receipt field "${key}" is required.`);
  return value;
}

function formatPoisha(value) {
  const amount = BigInt(value);
  return `${(amount / 100n).toLocaleString("en-IN")}.${String(amount % 100n).padStart(2, "0")}`;
}

function printable(value) {
  for (const ch of value) {
    const point = ch.codePointAt(0);
    if ((point >= 32 && point <= 126) || (point >= 160 && point <= 255) || WIN_ANSI[point])
      continue;
    return "See registration record for original text";
  }
  return value;
}

const ONES = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
  "eleven",
  "twelve",
  "thirteen",
  "fourteen",
  "fifteen",
  "sixteen",
  "seventeen",
  "eighteen",
  "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function words(n) {
  if (n < 20n) return ONES[n.toString()];
  if (n < 100n) return TENS[(n / 10n).toString()] + (n % 10n ? `-${words(n % 10n)}` : "");
  for (const [unit, name] of [
    [10000000n, "crore"],
    [100000n, "lakh"],
    [1000n, "thousand"],
    [100n, "hundred"],
  ]) {
    if (n >= unit) {
      const rest = n % unit;
      return `${words(n / unit)} ${name}${rest ? ` ${words(rest)}` : ""}`;
    }
  }
}

function formatDate(value) {
  const date = new Date(value);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value])
  );
  return {
    day: `${parts.day} ${parts.month} ${parts.year}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

const rgb = (hex) =>
  [1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(3)).join(" ");
const num = (n) => Number(n.toFixed(2));

/** Page drawing. All y values are measured from the top of the page. */
function draw(data, air = 0) {
  const f = {
    receipt: required(data, "receiptNumber"),
    reference: required(data, "applicationReference"),
    student: printable(required(data, "studentName")),
    course: printable(required(data, "courseName")),
    batch: printable(required(data, "batch")),
    method: required(data, "paymentMethod"),
    confirmed: formatDate(required(data, "confirmedAt")),
    issued: formatDate(required(data, "issuedAt")),
    txn: String(data.transactionId ?? "").trim(),
    paymentReference: printable(String(data.paymentReference ?? "").trim()),
  };
  const poisha = BigInt(data.collectedPoisha);
  const taka = poisha / 100n,
    rem = poisha % 100n;
  const figure = formatPoisha(poisha);
  const inWords = `Taka ${words(taka)}${rem ? ` and ${words(rem)} poisha` : ""} only`;

  const ops = [];
  const rect = (x, y, w, h, color) =>
    ops.push(`${rgb(color)} rg ${num(x)} ${num(PAGE_H - y - h)} ${num(w)} ${num(h)} re f`);
  const text = (value, x, y, { font = "regular", size = 10, color = INK, align = "left" } = {}) => {
    const bytes = encode(value);
    const px = align === "right" ? x - widthOf(value, font, size) : x;
    const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
    ops.push(
      `BT /${font} ${num(size)} Tf ${rgb(color)} rg 1 0 0 1 ${num(px)} ${num(PAGE_H - y)} Tm <${hex}> Tj ET`
    );
  };
  const label = (value, x, y, opts) => text(value, x, y, { size: 8.5, color: MUTED, ...opts });
  const fitted = (value, x, y, max, opts) =>
    text(value, x, y, { ...opts, size: fitSize(value, opts.font, opts.size, max) });

  const notes = (data.notes ?? DEFAULT_NOTES)
    .map((n) => String(n).replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 4);

  /** Square approval stamp, centred on (cx, cy) and tilted slightly. */
  function seal(cx, cy, day) {
    const size = 108,
      half = size / 2;
    const a = (5 * Math.PI) / 180,
      cos = Math.cos(a).toFixed(4),
      sin = Math.sin(a).toFixed(4);
    // Inside this block the origin is the seal centre and y points up.
    ops.push(
      `q ${cos} ${sin} ${-sin} ${cos} ${num(cx)} ${num(PAGE_H - cy)} cm /Stamp gs ${rgb(TEAL)} RG ${rgb(TEAL)} rg`
    );
    const frame = (inset, weight) =>
      ops.push(
        `${weight} w ${num(inset - half)} ${num(inset - half)} ${num(size - 2 * inset)} ${num(size - 2 * inset)} re S`
      );
    frame(0, 2.6);
    frame(5, 0.7);
    const centred = (value, dy, font, fontSize, spacing = 0) => {
      const w = widthOf(value, font, fontSize) + spacing * (value.length - 1);
      const s = Math.min(1, (size - 18) / w);
      const hex = encode(value)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      ops.push(
        `BT /${font} ${num(fontSize * s)} Tf ${num(spacing * s)} Tc ${num((-w * s) / 2)} ${dy} Td <${hex}> Tj 0 Tc ET`
      );
    };
    centred("LEAD NATION", 35, "semibold", 8.5, 1.1);
    centred("ACADEMY", 24.5, "semibold", 8.5, 1.1);
    ops.push(`-45 -6 90 25 re f 1 1 1 rg`);
    centred(data.isTest ? "TEST RECORD" : "PAYMENT CONFIRMED", 1, "display", 12.5, 0.4);
    ops.push(`${rgb(TEAL)} rg 2 w 1 J 1 j -7 -18 m -2 -23 l 8 -13 l S`);
    centred(day, -39, "semibold", 8.5, 0.4);
    ops.push("Q");
  }

  /** Rising bars from the logo, running along the foot of the page. */
  function skyline() {
    const count = 44,
      step = PAGE_W / count;
    for (let i = 0; i < count; i++) {
      const h = 4 + 22 * (i / (count - 1)) ** 1.6;
      rect(
        i * step + 1.5,
        PAGE_H - h,
        step - 3,
        h,
        i < count - 6 ? "#dde4ea" : i < count - 3 ? TEAL : INK
      );
    }
  }

  // Header
  rect(0, 0, PAGE_W, 7, INK);
  const logoH = 112,
    logoW = (logoH * ASSETS.logo.width) / ASSETS.logo.height;
  ops.push(`q ${num(logoW)} 0 0 ${logoH} ${L} ${num(PAGE_H - 28 - logoH)} cm /Logo Do Q`);
  text(data.isTest ? "Test Payment Receipt" : "Payment Receipt", R, 67, {
    font: "serif",
    size: 32,
    align: "right",
  });
  label("Receipt number", R, 93, { align: "right" });
  fitted(f.receipt, R, 109, 280, { font: "semibold", size: 13, align: "right" });
  label("Receipt issue date", R, 129, { align: "right" });
  text(f.issued.day, R, 144, { font: "semibold", size: 11, align: "right" });
  rect(L, 156, W, 1.4, INK);
  rect(L, 159.4, W, 0.5, INK);

  // Student and reference
  const colR = L + 340;
  label("Received from", L, 188);
  let nameSize = 25;
  if (widthOf(f.student, "serif", nameSize) > 310) nameSize = 19;
  const nameLines = wrap(f.student, "serif", nameSize, 310, 2);
  nameLines.forEach((s, i) =>
    text(s, L, 214 + i * (nameSize + 2), { font: "serif", size: nameSize })
  );
  label("Application reference", colR, 188);
  fitted(f.reference, colR, 210, R - colR, { font: "semibold", size: 11.5 });

  // Particulars
  let y = 240 + air + (nameLines.length - 1) * (nameSize + 2);
  rect(L, y, W, 28, TINT);
  label("Course", L + 14, y + 17.5, { font: "semibold", color: TEAL });
  label("Amount (BDT)", R - 14, y + 17.5, { font: "semibold", color: TEAL, align: "right" });
  y += 50;
  const courseLines = wrap(f.course, "semibold", 12, 330, 3);
  courseLines.forEach((s, i) => text(s, L + 14, y + i * 17, { font: "semibold", size: 12 }));
  fitted(data.feeBreakdown ? formatPoisha(data.feeBreakdown.basePoisha) : figure, R - 14, y, 125, {
    font: "regular",
    size: 12,
    align: "right",
  });
  y += (courseLines.length - 1) * 17 + 20;
  fitted(`Batch: ${f.batch}`, L + 14, y, 330, { font: "regular", size: 10, color: MUTED });
  if (data.feeBreakdown) {
    y += 21;
    text(data.feeBreakdown.label, L + 14, y, { size: 10, color: MUTED });
    fitted(`-${formatPoisha(data.feeBreakdown.reductionPoisha)}`, R - 14, y, 125, {
      font: "regular",
      size: 10,
      align: "right",
    });
  }
  y += 18;
  rect(L, y, W, 0.75, LINE);

  // Amount received
  y += 16 + air;
  const total = `BDT ${figure}`;
  const totalSize = fitSize(total, "display", 28, 235);
  const wordLines = wrap(
    inWords,
    "italic",
    12,
    W - 40 - widthOf(total, "display", totalSize) - 26,
    5
  );
  const boxH = Math.max(78, 46 + wordLines.length * 15);
  rect(L, y, W, boxH, INK);
  const top = y + (boxH - (18 + wordLines.length * 15)) / 2;
  text("Amount received", L + 20, top + 9, { font: "semibold", size: 10, color: "#ffffff" });
  wordLines.forEach((s, i) =>
    text(s, L + 20, top + 29 + i * 15, { font: "italic", size: 12, color: ON_INK })
  );
  text(total, R - 20, y + boxH / 2 + totalSize * 0.36, {
    font: "display",
    size: totalSize,
    color: "#ffffff",
    align: "right",
  });

  // Payment details, with the approval seal alongside
  y += boxH + 40 + air;
  const detailsTop = y;
  const detailsR = L + 340;
  text("Payment details", L, y, { font: "serif", size: 16 });
  y += 12;
  const details = [
    ["Payment method", f.method],
    ...(f.txn
      ? [["bKash TrxID", printable(f.txn)]]
      : f.paymentReference
        ? [["Payment reference", f.paymentReference]]
        : f.method === "bKash"
          ? [["bKash TrxID", "Not recorded"]]
          : []),
    ["Payment confirmed (Bangladesh time)", `${f.confirmed.day}, ${f.confirmed.time}`],
  ];
  for (const [name, value] of details) {
    rect(L, y, detailsR - L, 0.75, LINE);
    text(name, L, y + 19, { size: 9.5, color: MUTED });
    fitted(value, detailsR, y + 19, 188, { font: "semibold", size: 10, align: "right" });
    y += 30;
  }
  rect(L, y, detailsR - L, 0.75, LINE);
  seal((detailsR + R) / 2 + 6, (detailsTop - 12 + y) / 2, f.confirmed.day);

  // Notes: anchored above the footer
  if (notes.length) {
    const noteY = 710;
    rect(L, noteY - 18, W, 58 + 18, TINT);
    rect(L, noteY - 18, 3, 58 + 18, TEAL);
    text("Please note", L + 16, noteY, { font: "serif", size: 13 });
    notes.forEach((note, i) => {
      const x = L + 16 + (i % 2) * 244;
      const ny = noteY + 18 + Math.floor(i / 2) * 25;
      text(`${i + 1}.`, x, ny, { font: "semibold", size: 8, color: TEAL });
      wrap(note, "regular", 8, 214, 2).forEach((line, j) =>
        text(line, x + 12, ny + j * 10.5, { size: 8 })
      );
    });
  }

  // Footer
  rect(L, 778, W, 0.75, INK);
  text(
    data.isTest
      ? "Test record only. No payment acknowledged."
      : "Issued electronically by Lead Nation Academy.",
    L,
    796,
    { size: 8.5 }
  );
  text("Lead Nation Academy", R, 797, { font: "serif", size: 13, color: TEAL, align: "right" });
  skyline();
  fitted(`${data.issuerEmail}  |  ${data.issuerDomain}`, L, 808, 330, {
    font: "regular",
    size: 8,
    color: MUTED,
  });

  // Watermark: drawn last at very low opacity so it sits evenly over the page
  const markH = 350,
    markW = (markH * ASSETS.logo.width) / ASSETS.logo.height;
  ops.push(
    `q /Faint gs ${num(markW)} 0 0 ${markH} ${num((PAGE_W - markW) / 2)} ${num(PAGE_H - 270 - markH)} cm /Logo Do Q`
  );

  return { bottom: y, content: ops.join("\n"), title: `Payment Receipt ${f.receipt}` };
}

const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0));
const fromBase64 = (s) => ascii(atob(s));

/**
 * @param {ReceiptData} data
 * @returns {Uint8Array} PDF file bytes
 */
export function renderReceipt(data) {
  // Spare height on short receipts is shared between the three section gaps.
  const air = Math.max(0, Math.min(30, (668 - draw(data).bottom) / 3));
  const { content, title } = draw(data, air);
  const objects = [];
  const reserve = () => objects.push(null);
  const put = (id, dict, stream) => {
    objects[id - 1] = { dict, stream };
    return id;
  };
  const add = (dict, stream) => put(reserve(), dict, stream);

  const catalog = reserve(),
    pages = reserve(),
    page = reserve();

  const fontRefs = Object.entries(ASSETS.fonts).map(([key, font]) => {
    const bytes = fromBase64(font.data);
    const file = add(`/Filter /FlateDecode /Length1 ${font.length}`, bytes);
    const desc = add(
      `/Type /FontDescriptor /FontName /${font.name} /Flags 32 /FontBBox [${font.bbox.join(" ")}] ` +
        `/ItalicAngle ${font.italicAngle} /Ascent ${font.ascent} /Descent ${font.descent} /CapHeight ${font.capHeight} /StemV 80 /FontFile2 ${file} 0 R`
    );
    const id = add(
      `/Type /Font /Subtype /TrueType /BaseFont /${font.name} /Encoding /WinAnsiEncoding ` +
        `/FirstChar 32 /LastChar 255 /Widths [${font.widths.join(" ")}] /FontDescriptor ${desc} 0 R`
    );
    return `/${key} ${id} 0 R`;
  });

  const { width, height } = ASSETS.logo;
  const image = `/Type /XObject /Subtype /Image /Width ${width} /Height ${height} /BitsPerComponent 8 /Filter /FlateDecode`;
  const mask = add(`${image} /ColorSpace /DeviceGray`, fromBase64(ASSETS.logo.alpha));
  const logo = add(
    `${image} /ColorSpace /DeviceRGB /SMask ${mask} 0 R`,
    fromBase64(ASSETS.logo.rgb)
  );

  const faint = add("/Type /ExtGState /ca 0.045");
  const stamp = add("/Type /ExtGState /ca 0.94 /CA 0.94");
  const body = add("", ascii(content));
  const info = add(
    `/Title <${[...title]
      .map((c) => c.charCodeAt(0).toString(16).padStart(4, "0"))
      .join("")
      .replace(/^/, "feff")}> /Author (Lead Nation Academy)`
  );

  put(
    catalog,
    `/Type /Catalog /Pages ${pages} 0 R /Lang (en) /ViewerPreferences << /DisplayDocTitle true >>`
  );
  put(pages, `/Type /Pages /Kids [${page} 0 R] /Count 1`);
  put(
    page,
    `/Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << ${fontRefs.join(" ")} >> /XObject << /Logo ${logo} 0 R >> /ExtGState << /Faint ${faint} 0 R /Stamp ${stamp} 0 R >> >> /Contents ${body} 0 R`
  );

  const chunks = [];
  let length = 0;
  const push = (part) => {
    const b = typeof part === "string" ? ascii(part) : part;
    chunks.push(b);
    length += b.length;
  };

  push("%PDF-1.7\n%\xe2\xe3\xcf\xd3\n");
  const offsets = objects.map(({ dict, stream }, i) => {
    const at = length;
    push(`${i + 1} 0 obj\n<< ${dict}${stream ? ` /Length ${stream.length}` : ""} >>\n`);
    if (stream) {
      push("stream\n");
      push(stream);
      push("\nendstream\n");
    }
    push("endobj\n");
    return at;
  });
  const xref = length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.forEach((o) => push(`${String(o).padStart(10, "0")} 00000 n \n`));
  push(
    `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  );

  const pdf = new Uint8Array(length);
  let at = 0;
  for (const c of chunks) {
    pdf.set(c, at);
    at += c.length;
  }
  return pdf;
}
