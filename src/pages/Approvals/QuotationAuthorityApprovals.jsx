import { useCallback, useEffect, useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { toast } from "react-toastify";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime, formatMoney } from "../../services/apiClient";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const buttonClass = "inline-flex items-center justify-center rounded-2xl bg-[#166e8c] px-4 py-2 text-sm font-black text-white hover:bg-[#145f79] disabled:cursor-not-allowed disabled:bg-slate-300";
const rejectButtonClass = "inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300";
const vcThreshold = 500000;

const getArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  return [];
};

const authorityForUser = (user) => {
  if (user?.mainRole === "DPC") return "DPC";
  if (user?.mainRole === "UNIVERSITY_EXECUTIVE" && user?.subRole === "VC") return "VC";
  if (user?.mainRole === "FACULTY_STAFF" && user?.subRole === "DEAN") return "DEAN";
  return "";
};

const thresholdText = (authority) => {
  if (authority === "DEAN") return "First approval for all selected quotations";
  if (authority === "VC") return "After Dean approval above LKR 500,000";
  if (authority === "DPC") return "Direct DPC approval above LKR 1,000,000";
  return "Price based approval";
};

const isPdfDataUrl = (value) => typeof value === "string" && value.startsWith("data:application/pdf");

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

const buildAuthorityReportPdfBlob = (offer) => {
  const pages = [[]];
  const width = 595;
  const height = 842;
  const margin = 46;
  let y = 790;
  const current = () => pages[pages.length - 1];
  const addPage = () => {
    pages.push([]);
    y = 790;
  };
  const ensure = (needed = 40) => {
    if (y - needed < 48) addPage();
  };
  const text = (value, x, size = 9, style = "F1") => {
    current().push("BT", `/${style} ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(value)}) Tj`, "ET");
  };
  const line = (value, x = margin, size = 9, style = "F1") => {
    text(value, x, size, style);
    y -= size + 6;
  };
  const heading = (value) => {
    ensure(34);
    current().push("0.89 0.96 0.98 rg", `${margin} ${y - 6} ${width - margin * 2} 24 re f`, "0 0 0 rg");
    line(value, margin + 8, 11, "F2");
    y -= 8;
  };

  line("FACULTY OF ENGINEERING", 205, 13, "F2");
  line("UNIVERSITY OF RUHUNA", 205, 13, "F2");
  y -= 10;
  line("BEC Final Bid Evaluation Report", 170, 18, "F2");
  y -= 8;
  heading("Approval Summary");
  line(`Offer: ${offer.letterNumber || `Offer ${offer.offerLetterId}`}`);
  line(`RFQ: ${offer.rfqNumber || offer.rfqId || "-"}`);
  line(`Vendor: ${offer.vendorName || "-"}`);
  line(`Item: ${offer.requisitionItemName || "Final selected quotation"}`);
  line(`Amount: ${formatMoney(offer.offerAmount)}`);
  line(`Authority: ${offer.approvalAuthority || "-"}`);
  line(`Submitted: ${formatDateTime(offer.createdAt)}`);
  y -= 8;
  heading("BEC Report Content");
  wrapPdfText(offer.letterContent || "No BEC report content was submitted.", 92).forEach((contentLine) => {
    ensure(18);
    line(contentLine, margin, 8);
  });

  const pageObjects = [];
  const kids = [];
  pages.forEach((content, index) => {
    const pageObjId = 3 + index * 2;
    const contentObjId = pageObjId + 1;
    kids.push(`${pageObjId} 0 R`);
    const pageNo = `BT /F1 8 Tf 520 28 Td (Page ${index + 1}) Tj ET`;
    const stream = `${content.join("\n")}\n${pageNo}`;
    pageObjects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 ${3 + pages.length * 2} 0 R /F2 ${4 + pages.length * 2} 0 R >> >> /Contents ${contentObjId} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`
    );
  });
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`,
    ...pageObjects,
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

const approvalButtonLabel = (authority, offer, isSubmitting) => {
  if (isSubmitting) return "Saving...";
  const amount = Number(offer.offerAmount || 0);
  if (authority === "DEAN" && amount > vcThreshold) return "Recommend and send to VC";
  return "Approve";
};

export default function QuotationAuthorityApprovals() {
  const { token, user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState("");
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState("PENDING");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const authority = authorityForUser(user);

  const load = useCallback(async () => {
    if (!token || !authority) return;
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.offers.pendingAuthority(token, activeTab, page, 10);
      setOffers(getArray(data));
      setTotalPages(Math.max(Number(data?.totalPages || 1), 1));
      setTotalElements(Number(data?.totalElements ?? getArray(data).length));
      setSelectedId((current) => getArray(data).some((offer) => String(offer.offerLetterId) === current) ? current : "");
    } catch (loadError) {
      const errorMessage = loadError.message || "Could not load quotation approvals.";
      setError(errorMessage);
      toast.error(errorMessage, { toastId: `quotation-approvals-load-${authority}`, autoClose: 5000 });
    } finally {
      setLoading(false);
    }
  }, [token, authority, activeTab, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => {
    if (report?.url?.startsWith("blob:")) URL.revokeObjectURL(report.url);
  }, [report?.url]);

  const totalValue = useMemo(
    () => offers.reduce((sum, offer) => sum + Number(offer.offerAmount || 0), 0),
    [offers]
  );

  const decide = async (offer, decision) => {
    const comment = comments[offer.offerLetterId] || "";
    if (decision === "REJECTED" && !comment.trim()) {
      setError("Rejection comment is required.");
      toast.error("Rejection comment is required.", { autoClose: 4500 });
      return;
    }
    setSubmittingId(String(offer.offerLetterId));
    setError("");
    setMessage("");
    try {
      const updatedOffer = await procurementApi.offers.decideAuthority(token, offer.offerLetterId, {
        decision,
        comment: comment || `${authority} ${decision.toLowerCase()} quotation approval`,
      });
      const successMessage = decision === "APPROVED" ? "Quotation approval saved successfully." : "Quotation approval rejected.";
      setMessage(successMessage);
      toast.success(successMessage, { autoClose: 4500 });
      setComments((current) => ({ ...current, [offer.offerLetterId]: "" }));
      setOffers((current) => current.map((currentOffer) =>
        currentOffer.offerLetterId === offer.offerLetterId
          ? { ...currentOffer, ...updatedOffer, status: updatedOffer?.status || (decision === "APPROVED" ? "APPROVED_BY_AUTHORITY" : "REJECTED_BY_AUTHORITY") }
          : currentOffer
      ));
      setSelectedId("");
      setPage(0);
      setActiveTab(decision === "APPROVED" ? "APPROVED" : "REJECTED");
    } catch (decisionError) {
      const errorMessage = decisionError.message || "Could not save approval decision.";
      setError(errorMessage);
      toast.error(errorMessage, { autoClose: 5000 });
    } finally {
      setSubmittingId("");
    }
  };

  const createReport = (offer) => {
    if (report?.url?.startsWith("blob:")) URL.revokeObjectURL(report.url);
    if (isPdfDataUrl(offer.letterContent)) {
      const fileName = `Final-BEC-Report-${offer.letterNumber || offer.offerLetterId || "approval"}.pdf`.replace(/[^a-z0-9._-]+/gi, "-");
      const nextReport = { url: offer.letterContent, fileName };
      setReport(nextReport);
      return nextReport;
    }
    const blob = buildAuthorityReportPdfBlob(offer);
    const url = URL.createObjectURL(blob);
    const fileName = `BEC-Report-${offer.letterNumber || offer.offerLetterId || "approval"}.pdf`.replace(/[^a-z0-9._-]+/gi, "-");
    const nextReport = { url, fileName };
    setReport(nextReport);
    return nextReport;
  };

  const viewReport = (offer) => {
    const nextReport = createReport(offer);
    window.open(nextReport.url, "_blank", "noopener,noreferrer");
  };

  const downloadReport = (offer) => {
    const nextReport = createReport(offer);
    const link = document.createElement("a");
    link.href = nextReport.url;
    link.download = nextReport.fileName;
    link.click();
  };

  if (!authority) {
    return (
      <section className={cardClass}>
        <h1 className="text-2xl font-black text-[#10283f]">Approval Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Only Dean, VC, or DPC users can approve selected vendor quotations.</p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow={`${authority} Approval`}
        title="Quotation Approval"
        description="Approve BEC-selected lowest vendor quotations before BEC issues the purchase order."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">{thresholdText(authority)}</div>
          <div className="mt-2 text-3xl font-black">{totalElements}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {message && <div className="rounded-[24px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}

      <section className={cardClass}>
        <div className="mb-5 flex flex-wrap gap-3 border-b border-[#dce8ef] pb-4">
          {[{ key: "PENDING", label: "Pending Authority Approval" }, { key: "APPROVED", label: "Approved Items" }, { key: "REJECTED", label: "Rejected Items" }].map((tab) => (
            <button key={tab.key} type="button" onClick={() => { setActiveTab(tab.key); setPage(0); setSelectedId(""); }} className={`rounded-xl px-4 py-2 text-sm font-black ${activeTab === tab.key ? "bg-[#166e8c] text-white" : "bg-[#edf7fb] text-[#166e8c]"}`}>{tab.label}</button>
          ))}
        </div>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">{activeTab === "PENDING" ? "Pending Authority Approval" : activeTab === "APPROVED" ? "Approved Items" : "Rejected Items"}</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">{activeTab === "PENDING" ? "Selected vendor quotations" : activeTab === "APPROVED" ? "Approved vendor quotations" : "Rejected vendor quotations"}</h2>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              {totalElements} quotation{totalElements === 1 ? "" : "s"} | Page value {formatMoney(totalValue)}
            </div>
          </div>
          <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
            <RefreshRoundedIcon fontSize="small" />
            Refresh
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {loading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading quotation approvals...</div>}
          {!loading && offers.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No vendor quotations are waiting for your approval.</div>}
          {!loading && offers.length > 0 && <div className="overflow-hidden rounded-2xl border border-[#dce8ef]">
            {offers.map((offer) => <button key={offer.offerLetterId} type="button" onClick={() => { setSelectedId(String(offer.offerLetterId)); requestAnimationFrame(() => document.getElementById("authority-approval-details")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className={`grid w-full gap-2 border-b border-[#e8f0f5] px-4 py-3 text-left text-sm last:border-b-0 md:grid-cols-[1.1fr_1.2fr_1fr_0.8fr_auto] md:items-center ${selectedId === String(offer.offerLetterId) ? "bg-[#eaf7fb]" : "bg-white hover:bg-[#f7fbfd]"}`}><span className="font-black text-[#10283f]">{offer.letterNumber || `Offer ${offer.offerLetterId}`}</span><span className="truncate text-slate-700">{offer.requisitionItemName || offer.rfqNumber || "Selected quotation"}</span><span className="truncate text-slate-600">{offer.vendorName || "Vendor not recorded"}</span><span className="font-bold text-[#10283f] md:text-right">{formatMoney(offer.offerAmount)}</span><StatusPill status={offer.status || "SUBMITTED_TO_APPROVAL"} /></button>)}
          </div>}
          <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-slate-500">Page {page + 1} of {totalPages}</span><div className="flex gap-2"><button type="button" disabled={page === 0} onClick={() => setPage((value) => Math.max(value - 1, 0))} className="rounded-xl bg-[#edf7fb] px-4 py-2 text-sm font-black text-[#166e8c] disabled:opacity-40">Previous</button><button type="button" disabled={page + 1 >= totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-xl bg-[#166e8c] px-4 py-2 text-sm font-black text-white disabled:opacity-40">Next</button></div></div>
          {offers.filter((offer) => String(offer.offerLetterId) === selectedId).map((offer) => {
            const isSubmitting = submittingId === String(offer.offerLetterId);
            const isActionable = offer.status === "SUBMITTED_TO_APPROVAL" && (offer.approvalAuthority || authority) === authority;
            const isFinalized = !isActionable || offer.status === "APPROVED_BY_AUTHORITY" || offer.status === "REJECTED_BY_AUTHORITY";
            const finalizedText = offer.status === "REJECTED_BY_AUTHORITY"
              ? "rejected"
              : offer.status === "SUBMITTED_TO_APPROVAL" && offer.approvalAuthority !== authority
                ? "recommended and sent to the next approval authority"
                : "approved";
            return (
              <article id="authority-approval-details" key={offer.offerLetterId} className="scroll-mt-28 rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">{offer.letterNumber || `Offer ${offer.offerLetterId}`}</div>
                    <h3 className="mt-2 text-xl font-black text-[#10283f]">{offer.requisitionItemName || offer.rfqNumber || "Selected quotation"}</h3>
                    <div className="mt-2 text-sm leading-7 text-slate-600">
                      Vendor: <span className="font-bold text-[#10283f]">{offer.vendorName || "Vendor not recorded"}</span>
                    </div>
                  </div>
                  <StatusPill status={offer.status || "SUBMITTED_TO_APPROVAL"} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <DetailTile label="RFQ" value={offer.rfqNumber || offer.rfqId || "Not recorded"} />
                  <DetailTile label="Vendor ID" value={offer.vendorId || "Not recorded"} />
                  <DetailTile label="Offer Amount" value={formatMoney(offer.offerAmount)} />
                  <DetailTile label="Authority" value={offer.approvalAuthority || authority} />
                  <DetailTile label="Submitted At" value={formatDateTime(offer.createdAt)} />
                  <DetailTile label="Created By" value={offer.createdByTecName || "BEC/TEC"} />
                </div>

                {offer.letterContent && !isPdfDataUrl(offer.letterContent) && (
                  <pre className="mt-5 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-[20px] bg-white p-4 text-sm leading-7 text-slate-700">{offer.letterContent}</pre>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => viewReport(offer)}
                    className="rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-black text-[#166e8c] hover:bg-[#d9edf5]"
                  >
                    View BEC Report
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadReport(offer)}
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-[#166e8c] ring-1 ring-[#dce8ef] hover:bg-[#f8fcff]"
                  >
                    Download BEC Report
                  </button>
                </div>

                {isFinalized ? (
                  <div className={`mt-5 rounded-[18px] p-4 text-sm font-bold ${offer.status === "REJECTED_BY_AUTHORITY" ? "bg-orange-50 text-orange-700" : "bg-emerald-50 text-emerald-700"}`}>
                    This quotation is {finalizedText}.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    <textarea
                      className="w-full rounded-[18px] border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]"
                      rows={2}
                      value={comments[offer.offerLetterId] || ""}
                      onChange={(event) => setComments((current) => ({ ...current, [offer.offerLetterId]: event.target.value }))}
                      placeholder="Approval comment"
                    />
                    <div className="flex flex-wrap justify-end gap-3">
                      <button type="button" className={rejectButtonClass} disabled={isSubmitting} onClick={() => decide(offer, "REJECTED")}>
                        Reject
                      </button>
                      <button type="button" className={buttonClass} disabled={isSubmitting} onClick={() => decide(offer, "APPROVED")}>
                        {approvalButtonLabel(authority, offer, isSubmitting)}
                      </button>
                    </div>
                  </div>
                )}
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
