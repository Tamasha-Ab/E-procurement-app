const tenderTemplateRows = [
  ["Tender Reference No.", "tenderNumber"],
  ["Tender Title", "title"],
  ["Tender Type", "tenderType"],
  ["Procurement Method", "procurementMethod"],
  ["Estimated Contract Value (LKR)", "tenderValue"],
  ["Funding Source", "fundingSource"],
  ["Date of Publication", "dateOfPublication"],
  ["Closing Date & Time", "closingDateTime"],
  ["Description", "description"],
];

export const formatTenderCurrency = (value) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 2,
  }).format(amount);
};

export const buildTenderViewModel = (formOrTender) => ({
  tenderNumber: formOrTender.tenderNumber || "",
  title: formOrTender.title || "",
  tenderType: Array.isArray(formOrTender.tenderTypes)
    ? formOrTender.tenderTypes.join(", ")
    : formOrTender.tenderType || "",
  procurementMethod: formOrTender.procurementMethod || "",
  tenderValue: formatTenderCurrency(formOrTender.tenderValue),
  fundingSource: formOrTender.fundingSource || "",
  dateOfPublication: formOrTender.dateOfPublication || "",
  closingDateTime: formOrTender.closingDateTime
    ? new Date(formOrTender.closingDateTime).toLocaleString()
    : "",
  description: formOrTender.description || "",
});

export const tenderRows = tenderTemplateRows;

const escapePdfText = (value) => String(value ?? "")
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)");

const wrapPdfText = (value, maxLength = 70) => {
  const words = String(value || "Not filled").split(/\s+/);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    if ((line + " " + word).trim().length > maxLength) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = `${line} ${word}`.trim();
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : ["Not filled"];
};

const buildTenderPdfBlob = (formOrTender) => {
  const tender = buildTenderViewModel(formOrTender);
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 790 Td",
    "(Tender Details) Tj",
    "/F1 10 Tf",
    "0 -22 Td",
    "(University e-Procurement System - Sri Lanka Government Universities) Tj",
    "/F1 10 Tf",
  ];

  let cursorY = 730;
  tenderTemplateRows.forEach(([label, key]) => {
    content.push(
      "ET",
      "0.88 0.95 0.98 rg",
      `50 ${cursorY - 4} 495 24 re f`,
      "0.86 0.91 0.94 RG",
      `50 ${cursorY - 4} 495 24 re S`,
      "0 0 0 rg",
      "BT",
      "/F1 10 Tf",
      `50 ${cursorY} Td`,
      `(${escapePdfText(label)}:) Tj`
    );
    wrapPdfText(tender[key], 82).forEach((line, index) => {
      content.push(index === 0 ? "230 0 Td" : "0 -13 Td", `(${escapePdfText(line)}) Tj`);
      if (index === 0) content.push("-230 0 Td");
    });
    cursorY -= 30;
  });
  content.push("ET");

  const stream = content.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
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
  return new Blob([pdf], { type: "application/pdf" });
};

export const downloadTenderForm = (formOrTender) => {
  const blob = buildTenderPdfBlob(formOrTender);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${formOrTender.tenderNumber || "tender-creation-form"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
