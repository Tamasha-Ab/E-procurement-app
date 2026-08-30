import { useCallback, useEffect, useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime, formatMoney } from "../../services/apiClient";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const buttonClass = "inline-flex items-center justify-center rounded-2xl bg-[#166e8c] px-4 py-2 text-sm font-black text-white hover:bg-[#145f79] disabled:cursor-not-allowed disabled:bg-slate-300";
const inputClass = "w-full rounded-[18px] border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";
const logoPath = "/Images/ruhuna-logo.png";

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const escapePdfText = (value) => String(value ?? "")
  .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ")
  .replace(/\\/g, "\\\\")
  .replace(/\(/g, "\\(")
  .replace(/\)/g, "\\)");

const wrapPdfText = (value, maxChars = 92) => {
  const words = String(value || "-").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = next;
    }
  });
  if (line) lines.push(line);
  return lines.length ? lines : ["-"];
};

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Could not prepare offer letter PDF."));
  reader.readAsDataURL(blob);
});

const loadLogoHex = async () => {
  try {
    const image = new Image();
    image.crossOrigin = "anonymous";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = logoPath;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    const base64 = canvas.toDataURL("image/jpeg", 0.9).split(",")[1];
    const binary = atob(base64);
    let hex = "";
    for (let index = 0; index < binary.length; index += 1) {
      hex += binary.charCodeAt(index).toString(16).padStart(2, "0");
    }
    return { hex: `${hex}>`, width: canvas.width, height: canvas.height };
  } catch {
    return null;
  }
};

const buildDefaultOfferLetter = (offer) => [
  `Dear ${offer.vendorName || "Supplier"},`,
  "",
  `This is to inform you that your quotation for ${offer.requisitionItemName || offer.rfqNumber || "the selected procurement item"} has been selected as the lowest evaluated responsive offer after the BEC evaluation and authority approval process.`,
  "",
  "Quotation summary:",
  `RFQ: ${offer.rfqNumber || offer.rfqId || "Not recorded"}`,
  `Item: ${offer.requisitionItemName || "Selected quotation item"}`,
  `Vendor: ${offer.vendorName || "Vendor"}`,
  `Approved offer amount: ${formatMoney(itemAmountFor(offer))}`,
  `Final approval authority: ${offer.approvalAuthority || "Not recorded"}`,
  "",
  "Please review this offer letter and confirm acceptance through the vendor portal. The University reserves the right to issue the purchase order subject to the applicable procurement conditions.",
  "",
  "Yours faithfully,",
  "Bid Evaluation Committee",
  "University of Ruhuna",
].join("\n");

const itemAmountFor = (offer) => offer.itemOfferAmount ?? offer.quotedTotalPrice ?? offer.offerAmount;

const buildOfferLetterPdfBlob = async (offer, content) => {
  const logo = await loadLogoHex();
  const pages = [[]];
  const width = 595;
  const height = 842;
  const margin = 48;
  let y = 770;
  const current = () => pages[pages.length - 1];
  const addPage = () => {
    pages.push([]);
    y = 790;
  };
  const ensure = (needed = 28) => {
    if (y - needed < 56) addPage();
  };
  const line = (value, x = margin, size = 10, style = "F1") => {
    current().push("BT", `/${style} ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(value)}) Tj`, "ET");
    y -= size + 6;
  };
  if (logo) {
    current().push(`q 74 0 0 74 ${margin} 728 cm /Im1 Do Q`);
  }
  line("UNIVERSITY OF RUHUNA", 150, 15, "F2");
  line("FACULTY OF ENGINEERING", 150, 12, "F2");
  line("Bid Evaluation Committee", 150, 10, "F1");
  y -= 12;
  line("OFFER LETTER", 230, 18, "F2");
  y -= 10;
  line(`Date: ${new Date().toLocaleDateString()}`);
  line(`Offer Ref: ${offer.letterNumber || `Offer ${offer.offerLetterId}`}`);
  line(`Vendor: ${offer.vendorName || "Vendor"}`);
  y -= 8;
  line("Quotation Summary", margin, 12, "F2");
  [
    `RFQ: ${offer.rfqNumber || offer.rfqId || "Not recorded"}`,
    `Item: ${offer.requisitionItemName || "Selected quotation item"}`,
    `Approved amount: ${formatMoney(itemAmountFor(offer))}`,
    `Authority approval: ${offer.approvalAuthority || "Not recorded"} on ${formatDateTime(offer.approvedAt)}`,
  ].forEach((summaryLine) => line(summaryLine, margin + 12, 9));
  y -= 8;
  line("Letter Content", margin, 12, "F2");
  wrapPdfText(content, 88).forEach((contentLine) => {
    ensure(18);
    line(contentLine, margin, 9);
  });

  const pageObjects = [];
  const kids = [];
  const imageObjectId = logo ? 3 + pages.length * 2 : null;
  pages.forEach((content, index) => {
    const pageObjId = 3 + index * 2;
    const contentObjId = pageObjId + 1;
    kids.push(`${pageObjId} 0 R`);
    const pageNo = `BT /F1 8 Tf 520 28 Td (Page ${index + 1}) Tj ET`;
    const stream = `${content.join("\n")}\n${pageNo}`;
    pageObjects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${3 + pages.length * 2 + (logo ? 1 : 0)} 0 R /F2 ${4 + pages.length * 2 + (logo ? 1 : 0)} 0 R >> ${logo ? `/XObject << /Im1 ${imageObjectId} 0 R >>` : ""} >> /Contents ${contentObjId} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    );
  });
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`,
    ...pageObjects,
    ...(logo ? [`<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${logo.hex.length} >>\nstream\n${logo.hex}\nendstream`] : []),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
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

export default function BecSelectedVendors() {
  const { token, user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [poForms, setPoForms] = useState({});
  const [letterDrafts, setLetterDrafts] = useState({});
  const [letterReports, setLetterReports] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const isBecUser = user?.mainRole === "FINANCE" && user?.subRole === "BEC_HEAD";

  const load = useCallback(async () => {
    if (!token || !isBecUser) return;
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.offers.selectedVendors(token);
      const loadedOffers = getArray(data);
      setOffers(loadedOffers);
      setLetterDrafts((current) => {
        const next = { ...current };
        loadedOffers.forEach((offer) => {
          if (!next[offer.offerLetterId]) {
            next[offer.offerLetterId] = offer.letterContent && !String(offer.letterContent).startsWith("data:application/pdf")
              ? offer.letterContent
              : buildDefaultOfferLetter(offer);
          }
        });
        return next;
      });
    } catch (loadError) {
      setError(loadError.message || "Could not load selected vendors.");
    } finally {
      setLoading(false);
    }
  }, [token, isBecUser]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    Object.values(letterReports).forEach((report) => {
      if (report?.url) URL.revokeObjectURL(report.url);
    });
  }, [letterReports]);

  const totalValue = useMemo(
    () => offers.reduce((sum, offer) => sum + Number(itemAmountFor(offer) || 0), 0),
    [offers]
  );

  const setPoField = (offerId, field, value) => {
    setPoForms((current) => ({
      ...current,
      [offerId]: {
        ...(current[offerId] || {}),
        [field]: value,
      },
    }));
  };

  const offerAndSendPo = async (offer) => {
    const form = poForms[offer.offerLetterId] || {};
    setBusyKey(`offer-po-${offer.offerLetterId}`);
    setError("");
    setMessage("");
    try {
      await procurementApi.purchaseOrders.create(token, {
        offerLetterId: offer.offerLetterId,
        poNumber: form.poNumber || null,
        deliveryDeadline: form.deliveryDeadline || null,
      });
      setMessage("Vendor notified and purchase order sent.");
      setPoForms((current) => ({ ...current, [offer.offerLetterId]: {} }));
      await load();
    } catch (poError) {
      setError(poError.message || "Could not send purchase order.");
    } finally {
      setBusyKey("");
    }
  };

  const setLetterDraft = (offerId, value) => {
    setLetterDrafts((current) => ({ ...current, [offerId]: value }));
  };

  const createOfferLetterReport = async (offer) => {
    const content = letterDrafts[offer.offerLetterId] || buildDefaultOfferLetter(offer);
    const blob = await buildOfferLetterPdfBlob(offer, content);
    const url = URL.createObjectURL(blob);
    const fileName = `Offer-Letter-${offer.letterNumber || offer.offerLetterId}.pdf`.replace(/[^a-z0-9._-]+/gi, "-");
    setLetterReports((current) => {
      if (current[offer.offerLetterId]?.url) URL.revokeObjectURL(current[offer.offerLetterId].url);
      return { ...current, [offer.offerLetterId]: { url, fileName, blob } };
    });
    return { url, fileName, blob };
  };

  const viewOfferLetter = async (offer) => {
    setBusyKey(`letter-view-${offer.offerLetterId}`);
    try {
      const report = await createOfferLetterReport(offer);
      window.open(report.url, "_blank", "noopener,noreferrer");
    } catch (letterError) {
      setError(letterError.message || "Could not create offer letter PDF.");
    } finally {
      setBusyKey("");
    }
  };

  const downloadOfferLetter = async (offer) => {
    setBusyKey(`letter-download-${offer.offerLetterId}`);
    try {
      const report = letterReports[offer.offerLetterId] || await createOfferLetterReport(offer);
      const link = document.createElement("a");
      link.href = report.url;
      link.download = report.fileName;
      link.click();
    } catch (letterError) {
      setError(letterError.message || "Could not download offer letter PDF.");
    } finally {
      setBusyKey("");
    }
  };

  const sendOfferLetterToVendor = async (offer) => {
    setBusyKey(`letter-send-${offer.offerLetterId}`);
    setError("");
    setMessage("");
    try {
      const report = await createOfferLetterReport(offer);
      const letterContent = await blobToDataUrl(report.blob);
      await procurementApi.offers.sendToVendor(token, offer.offerLetterId, { letterContent });
      setMessage("Offer letter PDF sent to vendor.");
      await load();
    } catch (letterError) {
      setError(letterError.message || "Could not send offer letter to vendor.");
    } finally {
      setBusyKey("");
    }
  };

  if (!isBecUser) {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-black text-[#10283f]">BEC Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Only BEC Head users can manage selected vendors.</p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="BEC"
        title="Selected Vendors"
        description="Issue purchase orders to authority-approved selected vendors."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Selected Offers</div>
          <div className="mt-2 text-3xl font-black">{offers.length}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {message && <div className="rounded-[24px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}

      <section className={cardClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Authority Approved Vendors</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">Selected vendor list</h2>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              {offers.length} selected vendor{offers.length === 1 ? "" : "s"} | Total value {formatMoney(totalValue)}
            </div>
          </div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
            <RefreshRoundedIcon fontSize="small" />
            Refresh
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {loading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading selected vendors...</div>}
          {!loading && offers.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No selected vendors are waiting for BEC action.</div>}
          {offers.map((offer) => {
            const poBusy = busyKey === `offer-po-${offer.offerLetterId}`;
            const form = poForms[offer.offerLetterId] || {};
            const vendorAccepted = offer.status === "ACCEPTED_BY_VENDOR";
            const vendorRejected = offer.status === "REJECTED_BY_VENDOR";
            return (
              <article key={offer.offerLetterId} className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">{offer.letterNumber || `Offer ${offer.offerLetterId}`}</div>
                    <h3 className="mt-2 text-xl font-black text-[#10283f]">{offer.requisitionItemName || offer.rfqNumber || "Selected quotation"}</h3>
                    <div className="mt-2 text-sm leading-7 text-slate-600">
                      Vendor: <span className="font-bold text-[#10283f]">{offer.vendorName || "Vendor not recorded"}</span>
                    </div>
                  </div>
                  <StatusPill status={offer.status || "APPROVED_BY_AUTHORITY"} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <DetailTile label="RFQ" value={offer.rfqNumber || offer.rfqId || "Not recorded"} />
                  <DetailTile label="Vendor ID" value={offer.vendorId || "Not recorded"} />
                  <DetailTile label="Approved Amount" value={formatMoney(itemAmountFor(offer))} />
                  <DetailTile label="Final Authority" value={offer.approvalAuthority || "Not recorded"} />
                  <DetailTile label="Authority Approved At" value={formatDateTime(offer.approvedAt)} />
                  <DetailTile label="Authority Comment" value={offer.vcComment || "Approved"} />
                  <DetailTile label="Vendor Response" value={vendorAccepted ? "Accepted" : vendorRejected ? "Rejected" : "Waiting for response"} />
                  <DetailTile label="Vendor Comment" value={offer.vendorResponseComment || "No comment"} />
                </div>

                <div className="mt-5 rounded-[22px] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Offer Letter</div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">
                    Edit the vendor offer letter. The PDF includes the university logo and quotation summary.
                  </div>
                  <textarea
                    className={`${inputClass} mt-3 min-h-[260px] font-mono leading-7`}
                    value={letterDrafts[offer.offerLetterId] || buildDefaultOfferLetter(offer)}
                    onChange={(event) => setLetterDraft(offer.offerLetterId, event.target.value)}
                  />
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" onClick={() => viewOfferLetter(offer)} disabled={busyKey === `letter-view-${offer.offerLetterId}`} className={buttonClass}>
                      {busyKey === `letter-view-${offer.offerLetterId}` ? "Opening..." : "View Offer Letter PDF"}
                    </button>
                    <button type="button" onClick={() => downloadOfferLetter(offer)} disabled={busyKey === `letter-download-${offer.offerLetterId}`} className="inline-flex items-center justify-center rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#166e8c] ring-1 ring-[#dce8ef] hover:bg-[#f8fcff] disabled:cursor-not-allowed disabled:bg-slate-100">
                      {busyKey === `letter-download-${offer.offerLetterId}` ? "Preparing..." : "Download Offer Letter"}
                    </button>
                    <button type="button" onClick={() => sendOfferLetterToVendor(offer)} disabled={busyKey === `letter-send-${offer.offerLetterId}`} className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                      {busyKey === `letter-send-${offer.offerLetterId}` ? "Sending..." : "Send Offer Letter to Vendor"}
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-[22px] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Purchase Order</div>
                  {!vendorAccepted ? (
                    <div className={`mt-3 rounded-2xl p-4 text-sm font-semibold ${vendorRejected ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
                      {vendorRejected
                        ? "Vendor rejected this offer letter. Remove this item from the final list and select another vendor."
                        : "Waiting for vendor to accept the offer letter before issuing the purchase order."}
                    </div>
                  ) : null}
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <input
                      className={inputClass}
                      value={form.poNumber || ""}
                      onChange={(event) => setPoField(offer.offerLetterId, "poNumber", event.target.value)}
                      placeholder="PO number, optional"
                    />
                    <input
                      className={inputClass}
                      type="date"
                      value={form.deliveryDeadline || ""}
                      onChange={(event) => setPoField(offer.offerLetterId, "deliveryDeadline", event.target.value)}
                    />
                  </div>
                  <button type="button" onClick={() => offerAndSendPo(offer)} disabled={poBusy || !vendorAccepted} className={`${buttonClass} mt-4`}>
                    {poBusy ? "Sending..." : "Offer to Vendor and send PO"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[20px] bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 break-words text-sm font-bold text-[#10283f]">{value || "Not available"}</div>
    </div>
  );
}
