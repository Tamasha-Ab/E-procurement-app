export const parseRequisitionDescription = (description = "") => {
  const form = {};
  description.split(/\r?\n/).forEach((line) => {
    const [rawKey, ...rawValueParts] = line.split(":");
    if (!rawKey || rawValueParts.length === 0) return;
    const key = rawKey.trim();
    const value = rawValueParts.join(":").trim();

    if (key === "Faculty/Admin") form.facultyAdmin = value;
    if (key === "Department/Branch") form.departmentBranch = value;
    if (key === "Contact Person") form.contactPerson = value;
    if (key === "Telephone No") form.telephoneNo = value;
    if (key === "Included in procurement plan") form.includedInPlan = value;
    if (key === "Budgeted allocation") form.budgetAllocation = value;
    if (key === "Used amount so far") form.usedAmount = value;
    if (key === "Balance available") form.balanceAvailable = value;
    if (key === "Purpose") form.purpose = value;

    if (key === "Funds") {
      const fundsMatch = value.match(/GOSL\s+(Yes|No),\s+Project\s+(.*),\s+Vote\s+(.*)$/i);
      if (fundsMatch) {
        form.fundsGosl = fundsMatch[1];
        form.project = fundsMatch[2];
        form.vote = fundsMatch[3];
      }
    }
  });
  return form;
};

const money = (value) => new Intl.NumberFormat("en-LK", {
  style: "currency",
  currency: "LKR",
  maximumFractionDigits: 2,
}).format(Number(value || 0));

export const buildRequisitionViewModel = (request = {}) => {
  const form = parseRequisitionDescription(request.description || "");
  const firstItem = request.items?.[0] || {};
  return {
    rrNumber: request.rrNumber || "",
    title: request.title || "",
    submittedDate: request.submittedAt ? new Date(request.submittedAt).toLocaleDateString() : "",
    facultyAdmin: form.facultyAdmin || request.facultyName || "",
    departmentBranch: form.departmentBranch || request.divisionName || "",
    contactPerson: form.contactPerson || request.requestedByName || "",
    telephoneNo: form.telephoneNo || "",
    fundsGosl: form.fundsGosl || "",
    project: form.project || "",
    vote: form.vote || "",
    includedInPlan: form.includedInPlan || "",
    budgetAllocation: form.budgetAllocation || "",
    usedAmount: form.usedAmount || "",
    balanceAvailable: form.balanceAvailable || "",
    itemDescription: firstItem.description || firstItem.itemName || request.itemName || "",
    cost: money(firstItem.estimatedUnitPrice || request.estimatedUnitPrice),
    quantity: firstItem.quantity || request.quantity || "",
    purpose: form.purpose || "Normal",
    justification: request.justification || "",
    estimatedTotal: money(firstItem.estimatedTotalPrice || request.estimatedTotalAmount),
    specifications: request.technicalSpecifications || [],
  };
};

const escapePdfText = (value) => String(value ?? "")
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)");

const wrapText = (value, maxLength = 54) => {
  const words = String(value || "").split(/\s+/).filter(Boolean);
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
  return lines.length ? lines : [""];
};

const drawText = (ops, text, x, y, size = 9) => {
  ops.push("BT", `/F1 ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(text)}) Tj`, "ET");
};

const drawWrappedText = (ops, text, x, y, size = 8, maxLength = 52, maxLines = 4) => {
  wrapText(text, maxLength).slice(0, maxLines).forEach((line, index) => {
    drawText(ops, line, x, y - (index * (size + 3)), size);
  });
};

const rect = (ops, x, y, width, height) => {
  ops.push(`${x} ${y} ${width} ${height} re S`);
};

const fillRect = (ops, x, y, width, height, color = "0.95 0.97 0.99") => {
  ops.push(`${color} rg`, `${x} ${y} ${width} ${height} re f`, "0 0 0 rg");
};

const tableCell = (ops, x, y, width, height, label, value, shaded = false) => {
  if (shaded) fillRect(ops, x, y, width, height, "0.90 0.94 0.96");
  rect(ops, x, y, width, height);
  if (label && value) {
    const maxLength = Math.max(14, Math.floor(width / 5));
    const labelLines = wrapText(label, maxLength).slice(0, height < 34 ? 1 : 2);
    labelLines.forEach((line, index) => {
      drawText(ops, line, x + 5, y + height - 12 - (index * 10), 7);
    });
    const valueY = Math.max(y + 7, y + height - 14 - (labelLines.length * 10));
    const valueLines = Math.max(1, Math.floor((valueY - y + 2) / 10));
    drawWrappedText(ops, value, x + 5, valueY, 8, Math.max(16, Math.floor(width / 5)), valueLines);
    return;
  }
  if (label) drawWrappedText(ops, label, x + 5, y + height - 13, 8, Math.max(14, Math.floor(width / 5)), Math.max(1, Math.floor((height - 8) / 11)));
  if (value) drawWrappedText(ops, value, x + 5, y + height - 13, 8, Math.max(16, Math.floor(width / 5)), Math.max(1, Math.floor((height - 8) / 11)));
};

const labelValueBox = (ops, x, y, width, height, label, value) => {
  rect(ops, x, y, width, height);
  drawText(ops, label, x + 6, y + height - 12, 7);
  drawWrappedText(ops, value || "Not provided", x + 6, y + height - 27, 8, Math.max(16, Math.floor(width / 5)), 2);
};

const parseSpecRowsForPdf = (specificationText = "") => specificationText
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("Item Name") && !line.startsWith("Qty"))
  .map((line) => {
    const numberedMatch = line.match(/^\d+\.\s*(.*?)\s+-\s*(.*)$/);
    if (numberedMatch) {
      return { description: numberedMatch[1], requiredSpecification: numberedMatch[2] };
    }
    const [description, ...requiredParts] = line.split(":");
    return {
      description: description?.trim() || "Specification",
      requiredSpecification: requiredParts.join(":").trim() || "Not provided",
    };
  })
  .filter((row) => row.description || row.requiredSpecification);

const collectSampleImages = (request) => (request.technicalSpecifications || []).flatMap((spec) => {
  if (spec.sampleImages?.length) {
    return spec.sampleImages
      .filter((image) => image.imageBase64)
      .map((image) => ({
        name: image.imageName || "Sample image",
        contentType: image.contentType || "image/jpeg",
        base64: image.imageBase64,
      }));
  }
  return spec.sampleImageBase64 ? [{
    name: spec.sampleImageName || "Sample image",
    contentType: spec.sampleImageContentType || "image/jpeg",
    base64: spec.sampleImageBase64,
  }] : [];
});

const imageToJpeg = (dataUrl) => new Promise((resolve) => {
  const image = new Image();
  image.onload = () => {
    const canvas = document.createElement("canvas");
    const maxWidth = 320;
    const scale = Math.min(1, maxWidth / image.width);
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    resolve({
      data: canvas.toDataURL("image/jpeg", 0.86).split(",")[1],
      width: canvas.width,
      height: canvas.height,
    });
  };
  image.onerror = () => resolve(null);
  image.src = dataUrl;
});

const appendAscii = (parts, text) => {
  for (let i = 0; i < text.length; i += 1) parts.push(text.charCodeAt(i) & 0xff);
};

const appendBinary = (parts, binaryString) => {
  for (let i = 0; i < binaryString.length; i += 1) parts.push(binaryString.charCodeAt(i) & 0xff);
};

const buildPdfBlob = async (request) => {
  const rr = buildRequisitionViewModel(request);
  const sampleImages = (await Promise.all(collectSampleImages(request).slice(0, 4).map(async (image) => {
    const jpeg = await imageToJpeg(`data:${image.contentType};base64,${image.base64}`);
    return jpeg ? { ...jpeg, name: image.name } : null;
  }))).filter(Boolean);

  const formOps = ["0 0 0 RG", "0.8 w"];
  const specOps = ["0 0 0 RG", "0.8 w"];

  drawText(formOps, "UNIVERSITY OF RUHUNA - FACULTY OF ENGINEERING", 60, 795, 14);
  drawText(formOps, "PURCHASE REQUISITION FORM", 60, 778, 13);
  drawText(formOps, "Finance Branch | Tel: Extension 1101 | Email: bursar@eng.ruh.ac.lk", 60, 762, 8);
  labelValueBox(formOps, 430, 768, 110, 38, "Form No", rr.rrNumber);
  labelValueBox(formOps, 430, 722, 110, 38, "Date", rr.submittedDate);

  let y = 690;
  tableCell(formOps, 50, y - 78, 65, 78, "User", "", true);
  tableCell(formOps, 115, y - 26, 105, 26, "Faculty/Admin", "");
  tableCell(formOps, 220, y - 26, 320, 26, "", rr.facultyAdmin);
  tableCell(formOps, 115, y - 52, 105, 26, "Department/Branch", "");
  tableCell(formOps, 220, y - 52, 320, 26, "", rr.departmentBranch);
  tableCell(formOps, 115, y - 78, 105, 26, "Contact Person", "");
  tableCell(formOps, 220, y - 78, 160, 26, "", rr.contactPerson);
  tableCell(formOps, 380, y - 78, 70, 26, "Telephone No", "");
  tableCell(formOps, 450, y - 78, 90, 26, "", rr.telephoneNo);

  y -= 78;
  tableCell(formOps, 50, y - 150, 65, 150, "Funds", "", true);
  tableCell(formOps, 115, y - 32, 425, 32, "", `Funds GOSL ${rr.fundsGosl || "N/A"}    Project ${rr.project || "N/A"}    Vote ${rr.vote || "N/A"}`);
  tableCell(formOps, 115, y - 82, 215, 50, "Whether the item/items requested included in procurement plan", rr.includedInPlan || "Not provided");
  tableCell(formOps, 330, y - 82, 210, 50, "* If No should get the Vice Chancellor's approval", "Approved");
  tableCell(formOps, 115, y - 105, 215, 23, "Budgeted allocation Rs.", rr.budgetAllocation);
  tableCell(formOps, 115, y - 128, 215, 23, "Used amount so far Rs.", rr.usedAmount);
  tableCell(formOps, 115, y - 150, 215, 22, "Balance available Rs.", rr.balanceAvailable);
  tableCell(formOps, 330, y - 150, 210, 68, "Vice Chancellor", "");

  y -= 150;
  tableCell(formOps, 50, y - 142, 65, 142, "Object", "", true);
  tableCell(formOps, 115, y - 32, 215, 32, "Description of the item/items intended to be purchased", "");
  tableCell(formOps, 330, y - 32, 85, 32, "Cost", "");
  tableCell(formOps, 415, y - 32, 65, 32, "Qty. Required", "");
  tableCell(formOps, 480, y - 32, 60, 32, "Qty. Already", "");
  tableCell(formOps, 115, y - 142, 215, 110, "", rr.itemDescription);
  tableCell(formOps, 330, y - 142, 85, 110, "", rr.cost);
  tableCell(formOps, 415, y - 142, 65, 110, "", String(rr.quantity));
  tableCell(formOps, 480, y - 142, 60, 110, "", "");

  y -= 142;
  tableCell(formOps, 50, y - 60, 65, 60, "Purpose", "", true);
  tableCell(formOps, 115, y - 60, 425, 60, "", `${rr.purpose} | Estimated Total: ${rr.estimatedTotal} | ${rr.justification || "No justification provided"}`);

  drawText(specOps, "Annexure 01 - Specifications", 50, 795, 12);
  drawText(specOps, `Item Name - ${rr.itemDescription || rr.title || "Not provided"}`, 50, 774, 10);
  drawText(specOps, `Qty - ${rr.quantity || "Not provided"}`, 50, 758, 10);

  let specY = 730;
  tableCell(specOps, 50, specY - 28, 160, 28, "Description", "", true);
  tableCell(specOps, 210, specY - 28, 330, 28, "Required Specification", "", true);
  specY -= 28;

  const specRows = rr.specifications.flatMap((spec) => parseSpecRowsForPdf(spec.specificationText || ""));
  const limitedSpecRows = specRows.length
    ? specRows
    : [{ description: "Specification", requiredSpecification: "No specification text provided." }];

  let specificationsTruncated = false;
  limitedSpecRows.forEach((row, index) => {
    if (specY < 330) {
      if (!specificationsTruncated) {
        drawText(specOps, "Additional specification rows continue in the system view.", 50, specY - 14, 8);
        specificationsTruncated = true;
      }
      return;
    }
    const descriptionLines = wrapText(row.description, 22);
    const requirementLines = wrapText(row.requiredSpecification, 62);
    const rowHeight = Math.max(28, (Math.max(descriptionLines.length, requirementLines.length) * 11) + 14);
    if (specY - rowHeight < 300) {
      if (!specificationsTruncated) {
        drawText(specOps, "Additional specification rows continue in the system view.", 50, specY - 14, 8);
        specificationsTruncated = true;
      }
      specY = 292;
      return;
    }
    tableCell(specOps, 50, specY - rowHeight, 160, rowHeight, "", row.description);
    tableCell(specOps, 210, specY - rowHeight, 330, rowHeight, "", row.requiredSpecification);
    specY -= rowHeight;
  });

  if (sampleImages.length) {
    const imageTop = Math.min(specY - 20, 280);
    drawText(specOps, "Sample Images", 50, imageTop + 8, 10);
    sampleImages.forEach((image, index) => {
      const boxWidth = 220;
      const boxHeight = 108;
      const x = 50 + ((index % 2) * 250);
      const topY = imageTop - (Math.floor(index / 2) * 132);
      rect(specOps, x, topY - boxHeight, boxWidth, boxHeight);
      drawWrappedText(specOps, image.name || `Sample Image ${index + 1}`, x + 6, topY - 12, 7, 34, 1);
      const maxImageWidth = 150;
      const maxImageHeight = 78;
      const scale = Math.min(maxImageWidth / image.width, maxImageHeight / image.height, 1);
      const imageWidth = Math.max(1, Math.round(image.width * scale));
      const imageHeight = Math.max(1, Math.round(image.height * scale));
      const imageX = x + ((boxWidth - imageWidth) / 2);
      const imageY = topY - boxHeight + 12;
      specOps.push("q", `${imageWidth} 0 0 ${imageHeight} ${imageX.toFixed(2)} ${imageY.toFixed(2)} cm`, `/Im${index + 1} Do`, "Q");
    });
  } else {
    drawText(specOps, "Sample Images: No sample images attached.", 50, Math.min(specY - 20, 280), 9);
  }

  const formStream = formOps.join("\n");
  const specStream = specOps.join("\n");
  const imageBinaries = sampleImages.map((image) => ({ ...image, binary: atob(image.data) }));
  const xObjectEntries = imageBinaries.map((_, index) => `/Im${index + 1} ${8 + index} 0 R`).join(" ");
  const specResources = imageBinaries.length
    ? `/Font << /F1 5 0 R >> /XObject << ${xObjectEntries} >>`
    : "/Font << /F1 5 0 R >>";
  const objects = [
    { type: "text", value: "<< /Type /Catalog /Pages 2 0 R >>" },
    { type: "text", value: "<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>" },
    { type: "text", value: "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>" },
    { type: "text", value: `<< /Length ${formStream.length} >>\nstream\n${formStream}\nendstream` },
    { type: "text", value: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
    { type: "text", value: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << ${specResources} >> /Contents 7 0 R >>` },
    { type: "text", value: `<< /Length ${specStream.length} >>\nstream\n${specStream}\nendstream` },
  ];

  imageBinaries.forEach((image) => {
    objects.push({
      type: "mixed",
      before: `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.binary.length} >>\nstream\n`,
      binary: image.binary,
      after: "\nendstream",
    });
  });

  const bytes = [];
  const offsets = [0];
  appendAscii(bytes, "%PDF-1.4\n");
  objects.forEach((object, index) => {
    offsets.push(bytes.length);
    appendAscii(bytes, `${index + 1} 0 obj\n`);
    if (object.type === "mixed") {
      appendAscii(bytes, object.before);
      appendBinary(bytes, object.binary);
      appendAscii(bytes, object.after);
    } else {
      appendAscii(bytes, object.value);
    }
    appendAscii(bytes, "\nendobj\n");
  });

  const xrefOffset = bytes.length;
  appendAscii(bytes, `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  offsets.slice(1).forEach((offset) => {
    appendAscii(bytes, `${String(offset).padStart(10, "0")} 00000 n \n`);
  });
  appendAscii(bytes, `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
};

export const downloadRequisitionForm = async (request) => {
  const blob = await buildPdfBlob(request);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${request?.rrNumber || "purchase-requisition-form"}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};
