const formatCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(amount);
};

export const tenderFormRows = [
  { key: "tenderNumber", label: "Tender Reference No." },
  { key: "procuringEntityDepartment", label: "Procuring Entity / Department" },
  { key: "title", label: "Tender Title" },
  { key: "tenderType", label: "Tender Type (Goods / Works / Services / Consultancy / IT Systems)" },
  { key: "procurementMethod", label: "Procurement Method (NCB / National Shopping)" },
  { key: "tenderValue", label: "Estimated Contract Value (LKR)" },
  { key: "fundingSource", label: "Funding Source (GOSL / Project / Vote)" },
  { key: "publicationDate", label: "Date of Publication" },
  { key: "closingDateTime", label: "Closing Date & Time" },
  { key: "bidValidityPeriod", label: "Bid Validity Period" },
];

export const formatTenderDate = (value, includeTime = false) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-LK", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date);
};

export const getTenderFormValue = (tender, key) => {
  if (key === "tenderValue") return tender.tenderValue ? formatCurrency(tender.tenderValue) : "";
  if (key === "publicationDate") return formatTenderDate(tender.publicationDate);
  if (key === "closingDateTime") return formatTenderDate(tender.closingDateTime, true);
  return tender[key] || "";
};

const normalizePdfText = (value) =>
  String(value ?? "")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .trim();

const escapePdfText = (value) =>
  normalizePdfText(value)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const wrapPdfText = (value, maxChars) => {
  const text = normalizePdfText(value);
  if (!text) return [""];
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines;
};

export const downloadTenderForm = (tender) => {
  const pageWidth = 842;
  const pageHeight = 595;
  const margin = 26;
  const tableWidth = pageWidth - margin * 2;
  const labelWidth = 270;
  const startY = pageHeight - margin;
  const lineHeight = 13;
  let y = startY;
  const commands = ["1 w"];

  tenderFormRows.forEach((row) => {
    const labelLines = wrapPdfText(row.label, 34);
    const valueLines = wrapPdfText(getTenderFormValue(tender, row.key), 62);
    const rowHeight = Math.max(36, (Math.max(labelLines.length, valueLines.length) * lineHeight) + 18);
    y -= rowHeight;

    commands.push(`0.86 0.91 0.96 rg ${margin} ${y} ${labelWidth} ${rowHeight} re f`);
    commands.push(`0 0 0 RG ${margin} ${y} ${tableWidth} ${rowHeight} re S`);
    commands.push(`${margin + labelWidth} ${y} m ${margin + labelWidth} ${y + rowHeight} l S`);
    commands.push("0 0 0 rg");

    labelLines.forEach((line, index) => {
      commands.push(`BT /F2 12 Tf 1 0 0 1 ${margin + 10} ${y + rowHeight - 18 - (index * lineHeight)} Tm (${escapePdfText(line)}) Tj ET`);
    });
    valueLines.forEach((line, index) => {
      commands.push(`BT /F1 12 Tf 1 0 0 1 ${margin + labelWidth + 10} ${y + rowHeight - 18 - (index * lineHeight)} Tm (${escapePdfText(line)}) Tj ET`);
    });
  });

  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${tender.tenderNumber || "tender-form"}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
