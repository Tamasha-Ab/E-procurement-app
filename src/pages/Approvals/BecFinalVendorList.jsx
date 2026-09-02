import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime, formatMoney } from "../../services/apiClient";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const finalListStorageKey = "bec_final_vendor_list";
const dpcMemoThreshold = 1000000;
const vcThreshold = 500000;

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const tenderKeyFor = (tender) => String(tender.tenderId || tender.tenderNumber || tender.title || "unknown-tender");
const tenderLabelFor = (tender) =>
  `${tender.tenderNumber || `Tender ${tender.tenderId || "not recorded"}`} - ${tender.title || "Untitled"}`;
const normalizeTenderValue = (value) => String(value || "").trim().toLowerCase();
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const itemMatchesTender = (item, tender) => {
  if (!tender) return false;

  // Persisted IDs are authoritative. A non-matching ID must never fall back to
  // loose text matching (numeric IDs such as "1" previously matched many RFQs).
  if (item.tenderId && tender.tenderId) {
    return String(item.tenderId) === String(tender.tenderId);
  }

  const itemNumber = normalizeTenderValue(item.tenderNumber);
  const tenderNumber = normalizeTenderValue(tender.tenderNumber);
  if (itemNumber && tenderNumber) return itemNumber === tenderNumber;

  const itemTitle = normalizeTenderValue(item.tenderTitle);
  const tenderTitle = normalizeTenderValue(tender.title);
  if (itemTitle && tenderTitle) return itemTitle === tenderTitle;

  // Compatibility for older session entries that only stored the RFQ label.
  // Match a complete tender reference, never a bare database ID substring.
  if (tenderNumber) {
    const legacyText = normalizeTenderValue([item.rfqName, item.rfqContext].filter(Boolean).join(" "));
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(tenderNumber)}([^a-z0-9]|$)`, "i").test(legacyText);
  }
  return false;
};
const currencyText = (value) => formatMoney(value).replace(/[^\x20-\x7E]/g, "LKR ");
const reportFileName = (tender, category) =>
  `BEC-Bid-Evaluation-${(tender?.tenderNumber || "Tender").replace(/[^a-z0-9]+/gi, "-")}-${String(category || "Category").replace(/[^a-z0-9]+/gi, "-")}.pdf`;

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Could not prepare final BEC report for approval."));
  reader.readAsDataURL(blob);
});
const escapePdfText = (value) => String(value ?? "")
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)");
const wrapPdfText = (value, maxChars = 60) => {
  const words = String(value || "-").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    if ((line ? `${line} ${word}` : word).length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : ["-"];
};
const loadReportLogo = async () => {
  try {
    const response = await fetch("/Images/ruhuna-logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const binary = window.atob(dataUrl.split(",")[1] || "");
    let hex = "";
    for (let index = 0; index < binary.length; index += 1) {
      hex += binary.charCodeAt(index).toString(16).padStart(2, "0");
    }
    return { width: canvas.width, height: canvas.height, hex };
  } catch {
    return null;
  }
};

const buildBecReportPdfBlob = async ({ tender, category, items, categorySections, includeDpcMemo = false }) => {
  const logo = await loadReportLogo();
  const pages = [[]];
  const width = 595;
  const height = 842;
  const margin = 40;
  let y = 790;
  const current = () => pages[pages.length - 1];
  const addPage = () => {
    pages.push([]);
    y = 790;
  };
  const ensure = (needed = 50) => {
    if (y - needed < 48) addPage();
  };
  const text = (value, x, size = 9, style = "F1") => {
    current().push("BT", `/${style} ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(value)}) Tj`, "ET");
  };
  const centerText = (value, size = 9, style = "F1") => {
    const approximateWidth = String(value || "").length * size * 0.52;
    text(value, Math.max(margin, (width - approximateWidth) / 2), size, style);
  };
  const lineText = (value, x, size = 9, style = "F1") => {
    text(value, x, size, style);
    y -= size + 5;
  };
  const centerLine = (value, size = 9, style = "F1") => {
    centerText(value, size, style);
    y -= size + 5;
  };
  const image = (name, x, bottomY, imageWidth, imageHeight) => {
    current().push("q", `${imageWidth} 0 0 ${imageHeight} ${x} ${bottomY} cm`, `/${name} Do`, "Q");
  };
  const heading = (value) => {
    ensure(36);
    y -= 8;
    current().push("0.89 0.96 0.98 rg", `${margin} ${y - 5} ${width - margin * 2} 22 re f`, "0 0 0 rg");
    lineText(value, margin + 8, 11, "F2");
    y -= 6;
  };
  const kv = (label, value) => {
    ensure(20);
    text(`${label}:`, margin, 9, "F2");
    wrapPdfText(value, 72).forEach((line, index) => {
      if (index > 0) y -= 12;
      text(line, 180, 9);
    });
    y -= 17;
  };
  const memoKv = (number, label, value) => {
    const valueLines = wrapPdfText(value, 60).slice(0, 4);
    const labelLines = wrapPdfText(label, 28).slice(0, 3);
    const rowHeight = Math.max(26, Math.max(valueLines.length, labelLines.length) * 10 + 12);
    ensure(rowHeight + 8);
    const rowTop = y;
    const rowBottom = rowTop - rowHeight;
    current().push(
      "0.82 0.88 0.91 RG",
      `${margin} ${rowBottom} 28 ${rowHeight} re S`,
      `${margin + 28} ${rowBottom} 180 ${rowHeight} re S`,
      `${margin + 208} ${rowBottom} 307 ${rowHeight} re S`
    );
    current().push("0 0 0 rg", "BT", "/F2 8 Tf", `${margin + 10} ${rowTop - 15} Td`, `(${escapePdfText(number)}) Tj`, "ET");
    labelLines.forEach((line, index) => {
      current().push("0 0 0 rg", "BT", "/F2 8 Tf", `${margin + 36} ${rowTop - 15 - index * 10} Td`, `(${escapePdfText(line)}) Tj`, "ET");
    });
    valueLines.forEach((line, index) => {
      current().push("0 0 0 rg", "BT", "/F1 8 Tf", `${margin + 216} ${rowTop - 15 - index * 10} Td`, `(${escapePdfText(line)}) Tj`, "ET");
    });
    y = rowBottom - 4;
  };
  const table = (headers, rows, weights) => {
    const tableWidth = width - margin * 2;
    const totalWeight = weights.reduce((sum, item) => sum + item, 0);
    const colWidths = weights.map((item) => tableWidth * item / totalWeight);
    const drawRow = (cells, header = false) => {
      const wrapped = cells.map((cell, index) => wrapPdfText(cell, Math.max(10, Math.floor(colWidths[index] / 5.6))));
      const rowHeight = Math.max(22, Math.max(...wrapped.map((lines) => lines.length)) * 11 + 10);
      ensure(rowHeight + 8);
      let x = margin;
      current().push(header ? "0.89 0.96 0.98 rg" : "1 1 1 rg", `${margin} ${y - rowHeight} ${tableWidth} ${rowHeight} re f`, "0.82 0.88 0.91 RG");
      wrapped.forEach((lines, index) => {
        current().push(`${x} ${y - rowHeight} ${colWidths[index]} ${rowHeight} re S`);
        lines.slice(0, 6).forEach((line, lineIndex) => {
          current().push("0 0 0 rg", "BT", `/${header ? "F2" : "F1"} 8 Tf`, `${x + 4} ${y - 13 - lineIndex * 10} Td`, `(${escapePdfText(line)}) Tj`, "ET");
        });
        x += colWidths[index];
      });
      y -= rowHeight;
    };
    drawRow(headers, true);
    rows.forEach((row) => drawRow(row));
    y -= 12;
  };

  const sections = categorySections?.length ? categorySections : [{ category, items }];
  const reportItems = sections.flatMap((section) => section.items || []);
  const biddersFor = (sectionItems) => sectionItems.flatMap((item) =>
    Array.isArray(item.bidderDetails) && item.bidderDetails.length
      ? item.bidderDetails.map((bidder) => ({ ...bidder, itemName: item.itemName }))
      : [{
        bidderNo: "01",
        vendorName: item.vendorName,
        vendorId: item.vendorId,
        itemName: item.itemName,
        quantity: item.quantity,
        quotedUnitPrice: item.quotedUnitPrice,
        quotedTotalPrice: item.quotedTotalPrice,
        submittedAt: item.submittedAt,
        technicalStatus: item.status,
      }]
  );
  const categoryTotal = reportItems.reduce((sum, item) => sum + Number(item.quotedTotalPrice || 0), 0);
  const categoryVat = categoryTotal * 0.18;
  const categoryTotalWithVat = categoryTotal + categoryVat;
  const reportDate = new Date().toLocaleDateString();

  const renderDpcMemo = () => {
    y = 790;
    centerLine("DEPARTMENT PROCUREMENT COMMITTEE MEMO", 14, "F2");
    y -= 18;
    lineText("The Chairman", margin, 9, "F2");
    lineText("Department Procurement Committee", margin, 9);
    lineText("University of Ruhuna", margin, 9);
    y -= 10;
    text("DPC Memo No:", 355, 9, "F2");
    text(`${tender?.tenderNumber || "Tender"}/DPC/${String(category || "FINAL").slice(0, 12)}`, 430, 9);
    y -= 28;

    memoKv("1", "Procurement File Reference No.", tender?.tenderNumber || items[0]?.rfqName || "-");
    memoKv("2", "Description of Procurement", `Purchasing of ${category}: ${reportItems.map((item) => item.itemName).join(", ")}`);
    memoKv("3", "Procurement Method", tender?.procurementMethod || "National Shopping");
    memoKv("4", "Faculty and Department", "Engineering");
    memoKv("5", "Fund Source", tender?.fundingSource || "Capital Block Grant");

    heading("Dates");
    table(
      ["6 Quotation Date", "7 Bid Opening Date", "8 BEC Date", "9 Bid Bond Expires"],
      [[
        tender?.dateOfPublication || reportDate,
        tender?.closingDateTime ? new Date(tender.closingDateTime).toLocaleDateString() : reportDate,
        reportDate,
        "-",
      ]],
      [1, 1, 1, 1]
    );

    heading("11 Summary");
    table(
      ["Item Name", "Qty", "Unit Cost without VAT", "Total Cost without VAT", "Selected Supplier"],
      reportItems.map((item) => [
        item.itemName,
        item.quantity ?? "-",
        currencyText(item.quotedUnitPrice),
        currencyText(item.quotedTotalPrice),
        item.vendorName,
      ]),
      [2.1, 0.6, 1.3, 1.4, 1.8]
    );

    memoKv("12", "Total VAT Amount (18%)", currencyText(categoryVat));
    memoKv("13", "Total Cost with VAT", currencyText(categoryTotalWithVat));
    memoKv("14", "Remarks", "Selected items exceed LKR 1,000,000; DPC memo attached for approval.");
    memoKv("15", "Bid Evaluation Committee Recommendation", `BEC recommends awarding ${category} item(s) to the selected lowest evaluated responsive supplier(s).`);
    y -= 18;
    lineText("Y.D.G Jayawardena", margin, 9, "F2");
    lineText("Assistant Bursar/FoE", margin, 9);
  };

  if (logo) image("Logo", 247, 642, 102, 102);
  y = 610;
  centerLine("FACULTY OF ENGINEERING", 14, "F2");
  centerLine("UNIVERSITY OF RUHUNA", 14, "F2");
  y -= 28;
  centerLine("Bid Evaluation Report", 22, "F2");
  centerLine("(National Shopping)", 11);
  y -= 72;
  centerLine(`Quotation No: ${tender?.tenderNumber || reportItems[0]?.rfqName || "-"}`, 11, "F2");
  wrapPdfText(tender?.title || reportItems[0]?.tenderTitle || reportItems[0]?.rfqName || "Tender", 72).forEach((line) => centerLine(line, 11));
  y -= 28;
  centerLine(`Category: ${category}`, 11, "F2");
  y -= 94;
  centerLine(new Date().toLocaleDateString(), 11);

  if (includeDpcMemo) {
    addPage();
    renderDpcMemo();
  }

  addPage();

  sections.forEach((section, index) => {
    if (index > 0) addPage();
    const sectionItems = section.items || [];
    const allBidders = biddersFor(sectionItems);
    heading(`${section.category} - Bid Evaluation Report`);
    heading("1.0 Background");
    kv("File No.", tender?.tenderNumber || sectionItems[0]?.rfqName || "-");
    kv("Department", "Faculty of Engineering, University of Ruhuna");
    kv("Brief Description of Goods", `${section.category} - ${sectionItems.map((item) => item.itemName).join(", ")}`);
    kv("Estimated Amount", currencyText(tender?.tenderValue || sectionItems.reduce((sum, item) => sum + Number(item.quotedTotalPrice || 0), 0)));
    kv("Method of Procurement", tender?.procurementMethod || "National Shopping");

    heading("4.0 Bid Opening");
    table(
      ["Bidder No", "Name", "Item", "Bid Price as Read-out (Without VAT)", "Remarks"],
      allBidders.map((bidder, bidderIndex) => [
        bidder.bidderNo || String(bidderIndex + 1).padStart(2, "0"),
        bidder.vendorName || "Vendor not recorded",
        bidder.itemName || "-",
        currencyText(bidder.quotedTotalPrice),
        "Received before closing time",
      ]),
      [0.9, 1.7, 2.0, 1.5, 1.6]
    );

    heading("5.2 Preliminary Examination of Bids");
    table(
      ["Bidder No", "Name", "Completeness", "Substantial Responsiveness", "Accepted"],
      allBidders.map((bidder, bidderIndex) => [
        bidder.bidderNo || String(bidderIndex + 1).padStart(2, "0"),
        bidder.vendorName || "-",
        "YES",
        String(bidder.technicalStatus || "").toUpperCase().includes("REJECT") ? "NO" : "YES",
        String(bidder.technicalStatus || "").toUpperCase().includes("REJECT") ? "NO" : "YES",
      ]),
      [0.8, 2.0, 1.5, 1.7, 1.1]
    );

    heading("6.1 Clarifications sought from bidders");
    table(
      ["Bidder", "Nature of Clarification"],
      allBidders.map((bidder) => [bidder.vendorName || "-", bidder.comment || "-"]),
      [1.5, 4.0]
    );

    heading("7.1 Departures from Technical Specifications");
    table(
      ["Bidder No", "Name", "Item Descriptions", "Requirement", "Offered", "Rejected?", "Loading"],
      allBidders.map((bidder, bidderIndex) => [
        bidder.bidderNo || String(bidderIndex + 1).padStart(2, "0"),
        bidder.vendorName || "-",
        bidder.specificationDescription || bidder.itemName || "-",
        bidder.requiredSpecification || "-",
        [bidder.conformity, bidder.bidderResponse].filter(Boolean).join(" / ") || "-",
        String(bidder.technicalStatus || "").toUpperCase().includes("REJECT") ? "YES" : "NO",
        "-",
      ]),
      [0.7, 1.2, 1.5, 1.7, 1.7, 0.8, 0.8]
    );

    heading("8.1 Evaluation of Responsive Bids");
    table(
      ["Bidder No", "Name", "Bid Price Rs.", "Errors", "Discounts", "Additions", "Qty", "Evaluated Price Rs.", "Rank"],
      allBidders
        .slice()
        .sort((a, b) => Number(a.quotedTotalPrice || Infinity) - Number(b.quotedTotalPrice || Infinity))
        .map((bidder, bidderIndex) => [
          bidder.bidderNo || String(bidderIndex + 1).padStart(2, "0"),
          bidder.vendorName || "-",
          currencyText(bidder.quotedTotalPrice),
          "-",
          "-",
          "-",
          bidder.quantity ?? "-",
          currencyText(bidder.quotedTotalPrice),
          String(bidderIndex + 1),
        ]),
      [0.7, 1.2, 1.2, 0.8, 0.8, 0.9, 0.6, 1.3, 0.5]
    );

    heading("9.1 Contract Award Recommendation");
    table(
      ["Item", "Recommended Supplier", "Contract Amount", "Reason"],
      sectionItems.map((item) => [
        item.itemName,
        item.vendorName,
        currencyText(item.quotedTotalPrice),
        "Lowest evaluated technically responsive bid selected by BEC.",
      ]),
      [1.8, 1.7, 1.3, 2.5]
    );

    heading("Bid Evaluation Summary Report");
    table(
      ["No", "Description", "Value"],
      [
        ["01", "Name of the Procuring Entity", "Faculty of Engineering, University of Ruhuna"],
        ["02", "Title of the Procurement", tender?.title || sectionItems[0]?.rfqName || "-"],
        ["03", "Source of financing", tender?.fundingSource || "-"],
        ["04", "Method of Procurement", tender?.procurementMethod || "NS"],
        ["05", "Number of bids received", String(allBidders.length)],
        ["06", "Number of responsive bids", String(allBidders.filter((bidder) => !String(bidder.technicalStatus || "").toUpperCase().includes("REJECT")).length)],
        ["07", "Recommended lowest evaluated bidder", sectionItems.map((item) => `${item.itemName}: ${item.vendorName}`).join("; ")],
      ],
      [0.5, 2.3, 4.2]
    );
  });

  const pageObjects = [];
  const kids = [];
  pages.forEach((content, index) => {
    const pageObjId = 3 + index * 2;
    const contentObjId = pageObjId + 1;
    const logoObjId = 5 + pages.length * 2;
    kids.push(`${pageObjId} 0 R`);
    const pageNo = `BT /F1 8 Tf 520 28 Td (Page ${index + 1}) Tj ET`;
    const stream = `${content.join("\n")}\n${pageNo}`;
    pageObjects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R /F2 ${4 + pages.length * 2} 0 R >> ${logo ? `/XObject << /Logo ${logoObjId} 0 R >>` : ""} >> /Contents ${contentObjId} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    );
  });
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`,
    ...pageObjects,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    ...(logo ? [`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${logo.hex.length + 1} >>\nstream\n${logo.hex}>\nendstream`] : []),
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

const readFinalList = () => {
  try {
    const value = window.sessionStorage.getItem(finalListStorageKey);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeFinalList = (items) => {
  window.sessionStorage.setItem(finalListStorageKey, JSON.stringify(items));
};

export default function BecFinalVendorList() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState(() => readFinalList());
  const [tenders, setTenders] = useState([]);
  const [loadingTenders, setLoadingTenders] = useState(true);
  const [tenderError, setTenderError] = useState("");
  const [selectedTenderId, setSelectedTenderId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sentItemIds, setSentItemIds] = useState(() => new Set());
  const [approvedItemIds, setApprovedItemIds] = useState(() => new Set());
  const [listTab, setListTab] = useState("SELECTION");
  const [report, setReport] = useState(null);
  const [generatingReportKey, setGeneratingReportKey] = useState("");
  const [sendingApproval, setSendingApproval] = useState(false);
  const [notice, setNotice] = useState(null);
  const reportCardRef = useRef(null);
  const isBecUser = user?.mainRole === "FINANCE" && user?.subRole === "BEC_HEAD";

  const loadTenders = useCallback(async () => {
    if (!token || !isBecUser) return;
    setLoadingTenders(true);
    setTenderError("");
    try {
      const data = await procurementApi.tenders.list(token);
      setTenders(getArray(data));
    } catch (loadError) {
      setTenderError(loadError.message || "Could not load tenders.");
    } finally {
      setLoadingTenders(false);
    }
  }, [token, isBecUser]);

  useEffect(() => {
    loadTenders();
  }, [loadTenders]);

  const syncRejectedVendorResponses = useCallback(async () => {
    if (!token || !isBecUser) return;
    try {
      const data = await procurementApi.offers.selectedVendors(token);
      setApprovedItemIds(new Set(
        getArray(data)
          .filter((offer) => ["APPROVED_BY_AUTHORITY", "SENT_TO_VENDOR", "ACCEPTED_BY_VENDOR"].includes(String(offer.status || "").toUpperCase()))
          .map((offer) => String(offer.quotationItemId))
      ));
      const rejectedQuotationItemIds = new Set(
        getArray(data)
          .filter((offer) => offer.status === "REJECTED_BY_VENDOR" && offer.quotationItemId)
          .map((offer) => String(offer.quotationItemId))
      );
      if (!rejectedQuotationItemIds.size) return;
      setItems((current) => {
        const next = current.filter((item) => !rejectedQuotationItemIds.has(String(item.quotationItemId)));
        if (next.length !== current.length) {
          writeFinalList(next);
          setNotice({
            type: "success",
            message: "Vendor rejected an offer letter; rejected vendor item removed from the final list.",
          });
        }
        return next;
      });
    } catch (syncError) {
      setNotice({
        type: "error",
        message: syncError.message || "Could not sync vendor offer responses.",
      });
    }
  }, [token, isBecUser]);

  useEffect(() => {
    syncRejectedVendorResponses();
  }, [syncRejectedVendorResponses]);

  useEffect(() => () => {
    if (report?.url) URL.revokeObjectURL(report.url);
  }, [report?.url]);

  useEffect(() => {
    setReport((current) => {
      if (current?.url) URL.revokeObjectURL(current.url);
      return null;
    });
  }, [selectedTenderId, selectedCategory, listTab]);

  const selectedTender = useMemo(
    () => tenders.find((tender) => tenderKeyFor(tender) === selectedTenderId),
    [selectedTenderId, tenders]
  );

  const filteredItems = useMemo(
    () => !selectedTenderId ? [] : items.filter((item) => itemMatchesTender(item, selectedTender)),
    [items, selectedTenderId, selectedTender]
  );

  const selectedTenderCategoryCount = useMemo(
    () => new Set(filteredItems.map((item) => item.category || "Uncategorized")).size,
    [filteredItems]
  );

  useEffect(() => {
    if (selectedTenderId && !tenders.some((tender) => tenderKeyFor(tender) === selectedTenderId)) {
      setSelectedTenderId("");
    }
  }, [selectedTenderId, tenders]);

  const groupedCategories = useMemo(() => {
    const grouped = new Map();
    filteredItems.forEach((item) => {
      const existing = grouped.get(item.category) || { category: item.category || "Uncategorized", items: [], totalValue: 0 };
      existing.items.push(item);
      existing.totalValue += Number(item.quotedTotalPrice || 0);
      grouped.set(existing.category, existing);
    });
    return Array.from(grouped.values()).sort((a, b) => a.category.localeCompare(b.category));
  }, [filteredItems]);

  useEffect(() => {
    if (!groupedCategories.some((group) => group.category === selectedCategory)) setSelectedCategory("");
  }, [groupedCategories, selectedCategory]);

  const selectedCategoryGroup = useMemo(
    () => groupedCategories.find((group) => group.category === selectedCategory),
    [groupedCategories, selectedCategory]
  );

  const approvedTenderItems = useMemo(
    () => filteredItems.filter((item) => approvedItemIds.has(String(item.quotationItemId))),
    [approvedItemIds, filteredItems]
  );

  const totalValue = useMemo(
    () => filteredItems.reduce((sum, item) => sum + Number(item.quotedTotalPrice || 0), 0),
    [filteredItems]
  );

  const removeItem = (selectionKey) => {
    setItems((current) => {
      const next = current.filter((item) => item.selectionKey !== selectionKey);
      writeFinalList(next);
      return next;
    });
  };

  const generateCategoryReport = async (group) => {
    if (report?.url) URL.revokeObjectURL(report.url);
    setGeneratingReportKey(group.category);
    try {
      const blob = await buildBecReportPdfBlob({
        tender: selectedTender,
        category: group.category,
        items: group.items,
        includeDpcMemo: totalValue > dpcMemoThreshold,
      });
      const url = URL.createObjectURL(blob);
      setReport({
        url,
        fileName: reportFileName(selectedTender, group.category),
        category: group.category,
      });
    } finally {
      setGeneratingReportKey("");
    }
  };

  const generateItemReport = async (item) => {
    if (report?.url) URL.revokeObjectURL(report.url);
    setGeneratingReportKey(item.selectionKey);
    try {
      const blob = await buildBecReportPdfBlob({
        tender: selectedTender,
        category: item.category,
        items: [item],
        includeDpcMemo: Number(item.quotedTotalPrice || 0) > dpcMemoThreshold,
      });
      setReport({
        url: URL.createObjectURL(blob),
        fileName: reportFileName(selectedTender, `${item.category}-${item.itemName}`),
        category: `${item.category} - ${item.itemName}`,
      });
      toast.success(`BEC report generated for ${item.itemName}.`);
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        reportCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }));
    } catch (error) {
      toast.error(error.message || "Could not generate the item BEC report.");
    } finally {
      setGeneratingReportKey("");
    }
  };

  const sendItemToApproval = async (item) => {
    if (!item.quotationItemId || sentItemIds.has(String(item.quotationItemId))) return;
    setSendingApproval(true);
    try {
      const amount = Number(item.quotedTotalPrice || 0);
      const reportBlob = await buildBecReportPdfBlob({
        tender: selectedTender,
        category: item.category,
        items: [item],
        includeDpcMemo: amount > dpcMemoThreshold,
      });
      const reportContent = await blobToDataUrl(reportBlob);
      await procurementApi.quotations.selectItemVendor(token, item.quotationItemId, {
        selected: true,
        comment: "Item-wise BEC report submitted to the quotation approval workflow.",
        offerLetterContent: reportContent,
        approvalAuthority: amount > dpcMemoThreshold ? "DPC" : "DEAN",
        approvalAmount: amount,
      });
      setSentItemIds((current) => new Set(current).add(String(item.quotationItemId)));
      toast.success(`${item.itemName} BEC report sent to approval.`);
    } catch (error) {
      toast.error(error.message || "Could not send the item BEC report to approval.");
    } finally {
      setSendingApproval(false);
    }
  };

  const generateFinalReport = async () => {
    if (!approvedTenderItems.length) {
      toast.info("No authority-approved items are available for the final BEC report.");
      return;
    }
    if (report?.url) URL.revokeObjectURL(report.url);
    setGeneratingReportKey("FINAL");
    try {
      const blob = await buildBecReportPdfBlob({
        tender: selectedTender,
        category: selectedTenderId === "ALL" ? "Final BEC Report" : "Final BEC Report - All Categories",
        items: approvedTenderItems,
        categorySections: groupedCategories.map((group) => ({ ...group, items: group.items.filter((item) => approvedItemIds.has(String(item.quotationItemId))) })).filter((group) => group.items.length),
        includeDpcMemo: approvedTenderItems.reduce((sum, item) => sum + Number(item.quotedTotalPrice || 0), 0) > dpcMemoThreshold,
      });
      const url = URL.createObjectURL(blob);
      setReport({
        url,
        fileName: reportFileName(selectedTender, "Final-BEC-Report"),
        category: selectedTenderId === "ALL" || !selectedTender ? "Final BEC Report" : `${tenderLabelFor(selectedTender)} - Final BEC Report`,
      });
    } finally {
      setGeneratingReportKey("");
    }
  };

  const downloadReport = () => {
    if (!report?.url) return;
    const link = document.createElement("a");
    link.href = report.url;
    link.download = report.fileName;
    link.click();
  };

  const approvalRouteLabel = useMemo(() => {
    if (totalValue > dpcMemoThreshold) return "DPC direct approval with DPC memo";
    if (totalValue > vcThreshold) return "Dean recommendation, then VC approval";
    return "Dean approval";
  }, [totalValue]);

  const sendToApproval = async () => {
    if (!filteredItems.length) {
      setNotice({ type: "error", message: "No selected vendors available to send for approval." });
      return;
    }
    const authority = totalValue > dpcMemoThreshold ? "DPC" : "DEAN";
    setSendingApproval(true);
    setNotice(null);
    try {
      const reportBlob = await buildBecReportPdfBlob({
        tender: selectedTender,
        category: selectedTenderId === "ALL" ? "Final BEC Report" : "Final BEC Report - All Categories",
        items: filteredItems,
        categorySections: groupedCategories,
        includeDpcMemo: totalValue > dpcMemoThreshold,
      });
      const reportContent = await blobToDataUrl(reportBlob);
      if (report?.url) URL.revokeObjectURL(report.url);
      const reportUrl = URL.createObjectURL(reportBlob);
      setReport({
        url: reportUrl,
        fileName: reportFileName(selectedTender, "Final-BEC-Report"),
        category: selectedTenderId === "ALL" || !selectedTender ? "Final BEC Report" : `${tenderLabelFor(selectedTender)} - Final BEC Report`,
      });
      await Promise.all(filteredItems.map((item) => {
        if (!item.quotationItemId) {
          throw new Error(`${item.itemName || "Selected item"} is missing quotation item ID.`);
        }
        return procurementApi.quotations.selectItemVendor(token, item.quotationItemId, {
          selected: true,
          comment: `Final BEC report sent for ${approvalRouteLabel}.`,
          offerLetterContent: reportContent,
          approvalAuthority: authority,
          approvalAmount: totalValue,
        });
      }));
      setNotice({ type: "success", message: `Final BEC report sent for ${approvalRouteLabel}.` });
    } catch (approvalError) {
      setNotice({ type: "error", message: approvalError.message || "Could not send final BEC report for approval." });
    } finally {
      setSendingApproval(false);
    }
  };

  if (!isBecUser) {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-black text-[#10283f]">BEC Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Only BEC Head users can view the final vendor list.</p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="BEC"
        title="Final Vendor List"
        description="Category-wise final list of lowest price vendor quotations selected during BEC vendor review."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Final Items</div>
          <div className="mt-2 text-3xl font-black">{items.length}</div>
        </div>
      </PageHero>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="w-fit rounded-2xl border border-[#b9d8e4] bg-white px-5 py-3 text-sm font-black text-[#166e8c] shadow-sm hover:bg-[#edf7fb]"
      >
        ← Back
      </button>

      <section className={cardClass}>
        {notice && (
          <div className={`mb-5 rounded-[24px] p-4 text-sm font-semibold ${notice.type === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {notice.message}
          </div>
        )}

        <div className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Tender Filter</div>
              <h2 className="mt-2 text-2xl font-black text-[#10283f]">View categories by tender</h2>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                {!selectedTenderId
                  ? `${tenders.length} tender${tenders.length === 1 ? "" : "s"} loaded. Select a tender to continue.`
                  : `${selectedTenderCategoryCount} categor${selectedTenderCategoryCount === 1 ? "y" : "ies"} for ${selectedTender ? tenderLabelFor(selectedTender) : "selected tender"}`}
              </div>
            </div>
            <label className="w-full lg:max-w-md">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">Tender</span>
              <select
                value={selectedTenderId}
                onChange={(event) => setSelectedTenderId(event.target.value)}
                className="mt-2 w-full rounded-[18px] border border-[#dce8ef] bg-white px-4 py-3 text-sm font-bold text-[#10283f] outline-none focus:border-[#166e8c]"
              >
                <option value="">Select a tender</option>
                {tenders.map((tender) => (
                  <option key={tenderKeyFor(tender)} value={tenderKeyFor(tender)}>
                    {tenderLabelFor(tender)}
                  </option>
                ))}
              </select>
              {loadingTenders && <span className="mt-2 block text-xs font-semibold text-slate-500">Loading tenders...</span>}
              {tenderError && <span className="mt-2 block text-xs font-semibold text-red-600">{tenderError}</span>}
            </label>
          </div>

          {selectedTenderId && selectedTender ? (
            <div className="mt-4 rounded-[18px] bg-white p-4 text-sm font-semibold text-slate-600">
              {[selectedTender.status, selectedTender.tenderType, selectedTender.procurementMethod]
                .filter(Boolean)
                .join(" | ") || "Tender details loaded from Tender Directory."}
            </div>
          ) : null}
        </div>

        {selectedTenderId && <div className="mt-6 flex flex-wrap gap-3 border-b border-[#dce8ef] pb-4">
          <button type="button" onClick={() => setListTab("SELECTION")} className={`rounded-xl px-4 py-2 text-sm font-black ${listTab === "SELECTION" ? "bg-[#166e8c] text-white" : "bg-[#edf7fb] text-[#166e8c]"}`}>Category final list</button>
          <button type="button" onClick={() => setListTab("APPROVED")} className={`rounded-xl px-4 py-2 text-sm font-black ${listTab === "APPROVED" ? "bg-[#166e8c] text-white" : "bg-[#edf7fb] text-[#166e8c]"}`}>Approved items</button>
        </div>}

        {selectedTenderId && listTab === "SELECTION" && <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Selected Lowest Vendors</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">Category final list</h2>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              {filteredItems.length} selected item{filteredItems.length === 1 ? "" : "s"} | Total value {formatMoney(totalValue)}
            </div>
          </div>
        </div>}

        <div className="mt-6 space-y-5">
          {selectedTenderId && items.length === 0 && (
            <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">
              No vendors have been added to the final list yet. Select a category item in Vendor Review and add the lowest price vendor.
            </div>
          )}

          {selectedTenderId && items.length > 0 && filteredItems.length === 0 && (
            <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">
              No selected lowest vendors found for this tender.
            </div>
          )}

          {selectedTenderId && listTab === "SELECTION" && groupedCategories.length > 0 && (
            <div className="overflow-hidden rounded-[20px] border border-[#dce8ef]">
              <table className="min-w-full divide-y divide-[#dce8ef] text-left text-sm">
                <thead className="bg-[#edf7fb] text-xs font-black uppercase tracking-[0.14em] text-[#166e8c]">
                  <tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Items</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Action</th></tr>
                </thead>
                <tbody className="divide-y divide-[#e8f0f5] bg-white">
                  {groupedCategories.map((group) => (
                    <tr key={group.category} className={selectedCategory === group.category ? "bg-[#eaf7fb]" : "hover:bg-[#f8fcff]"}>
                      <td className="px-4 py-3 font-black text-[#10283f]">{group.category}</td>
                      <td className="px-4 py-3 text-slate-600">{group.items.length}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#10283f]">{formatMoney(group.totalValue)}</td>
                      <td className="px-4 py-3 text-right"><button type="button" onClick={() => { setSelectedCategory(group.category); requestAnimationFrame(() => document.getElementById("bec-category-items")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className="rounded-xl bg-[#166e8c] px-4 py-2 text-xs font-black text-white">View items</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {listTab === "SELECTION" && selectedCategoryGroup && [selectedCategoryGroup].map((group) => (
            <article key={group.category} className="rounded-[24px] border border-[#dce8ef] bg-[#fbfdff] p-5">
              <div id="bec-category-items" className="scroll-mt-28" />
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">Category</div>
                  <h3 className="mt-2 text-xl font-black text-[#10283f]">{group.category}</h3>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-[20px] border border-[#dce8ef]">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-[#dce8ef] text-left text-sm">
                    <thead className="bg-[#edf7fb] text-xs font-black uppercase tracking-[0.14em] text-[#166e8c]">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Vendor</th>
                        <th className="px-4 py-3">RFQ</th>
                        <th className="px-4 py-3 text-right">Quantity</th>
                        <th className="px-4 py-3 text-right">Unit Price</th>
                        <th className="px-4 py-3 text-right">Total Price</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8f0f5] bg-white">
                      {group.items.map((item) => (
                        <tr key={item.selectionKey}>
                          <td className="px-4 py-4 align-top">
                            <div className="font-black text-[#10283f]">{item.itemName}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Added {formatDateTime(item.addedAt)}</div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="font-black text-[#10283f]">{item.vendorName}</div>
                            <div className="mt-1 text-xs font-semibold text-slate-500">Vendor ID {item.vendorId || "N/A"}</div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <div className="font-bold text-[#10283f]">{item.rfqName || item.rfqId || "RFQ not recorded"}</div>
                            <div className="mt-1 text-xs text-slate-500">{item.rfqContext || "Approved quotation"}</div>
                          </td>
                          <td className="px-4 py-4 text-right align-top font-semibold text-slate-700">{item.quantity ?? "N/A"}</td>
                          <td className="px-4 py-4 text-right align-top font-bold text-[#10283f]">{formatMoney(item.quotedUnitPrice)}</td>
                          <td className="px-4 py-4 text-right align-top text-base font-black text-[#10283f]">{formatMoney(item.quotedTotalPrice)}</td>
                          <td className="px-4 py-4 align-top"><StatusPill status={item.status || "APPROVED"} /></td>
                          <td className="px-4 py-4 text-right align-top">
                            <div className="flex min-w-[250px] justify-end gap-2">
                              <button type="button" onClick={() => generateItemReport(item)} disabled={generatingReportKey === item.selectionKey} className="rounded-xl bg-[#edf7fb] px-3 py-2 text-xs font-black text-[#166e8c] disabled:cursor-not-allowed disabled:opacity-50">{generatingReportKey === item.selectionKey ? "Generating..." : "Generate / View Report"}</button>
                              <button type="button" onClick={() => sendItemToApproval(item)} disabled={sendingApproval || sentItemIds.has(String(item.quotationItemId))} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{sentItemIds.has(String(item.quotationItemId)) ? "Sent" : "Send to approval"}</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </article>
          ))}

          {report && (
            <div ref={reportCardRef} className="scroll-mt-28 rounded-[24px] border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">BEC Report Ready</div>
                  <h3 className="mt-2 text-lg font-black text-[#10283f]">{report.category}</h3>
                  <div className="mt-1 text-sm font-semibold text-emerald-800">{report.fileName}</div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <a href={report.url} target="_blank" rel="noreferrer" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-[#166e8c] hover:bg-[#edf7fb]">View PDF</a>
                  <button type="button" onClick={downloadReport} className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-black text-white hover:bg-[#145f79]">Download PDF</button>
                </div>
              </div>
            </div>
          )}

          {selectedTenderId && listTab === "APPROVED" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div><h2 className="text-xl font-black text-[#10283f]">Authority-approved items</h2><p className="mt-1 text-sm text-slate-600">Approved items for the selected tender, grouped by category in the final PDF.</p></div>
                <button type="button" onClick={generateFinalReport} disabled={!approvedTenderItems.length || generatingReportKey === "FINAL"} className="rounded-xl bg-[#166e8c] px-4 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{generatingReportKey === "FINAL" ? "Generating..." : "Generate Final BEC Report"}</button>
              </div>
              <div className="overflow-hidden rounded-[20px] border border-[#dce8ef]">
                <table className="min-w-full divide-y divide-[#dce8ef] text-left text-sm">
                  <thead className="bg-[#edf7fb] text-xs font-black uppercase tracking-[0.12em] text-[#166e8c]"><tr><th className="px-4 py-3">Category</th><th className="px-4 py-3">Item</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th></tr></thead>
                  <tbody className="divide-y divide-[#e8f0f5] bg-white">
                    {approvedTenderItems.map((item) => <tr key={item.selectionKey}><td className="px-4 py-3 font-bold">{item.category}</td><td className="px-4 py-3">{item.itemName}</td><td className="px-4 py-3">{item.vendorName}</td><td className="px-4 py-3 text-right font-bold">{formatMoney(item.quotedTotalPrice)}</td><td className="px-4 py-3"><StatusPill status="APPROVED" /></td></tr>)}
                    {!approvedTenderItems.length && <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-500">No approved items are available yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
