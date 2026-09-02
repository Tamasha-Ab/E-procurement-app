import { useEffect, useMemo, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime, formatMoney } from "../../services/apiClient";
import PaginationControls from "../../components/PaginationControls";
import { toast } from "react-toastify";

const cardClass = "rounded-[28px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.07)]";
const inputClass = "w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 text-sm outline-none focus:border-[#166e8c]";
const buttonClass = "rounded-2xl px-5 py-3 text-sm font-bold text-white disabled:opacity-60";

function parseVendorSpecificationRows(specificationText = "") {
  return String(specificationText || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const withoutNumber = line.replace(/^\d+\.\s*/, "");
      const [descriptionPart, detailPart = ""] = withoutNumber.split(/\s+-\s+Required:\s*/);
      const [requiredPart = "", conformityPart = ""] = detailPart.split(/\s+\|\s+Conformity:\s*/);
      const [conformity = "", bidderResponse = ""] = conformityPart.split(/\s+\|\s+Bidder Response:\s*/);
      return {
        description: descriptionPart.trim(),
        requiredSpecification: requiredPart.trim(),
        conformity: conformity.trim(),
        bidderResponse: bidderResponse.trim(),
      };
    })
    .filter((row) => row.description || row.requiredSpecification || row.conformity || row.bidderResponse);
}

function VendorSpecificationTable({ specificationText, requiredSpecification }) {
  const parsedRows = parseVendorSpecificationRows(specificationText);
  const rows = parsedRows.length ? parsedRows : [{
    description: "Specification",
    requiredSpecification: requiredSpecification || "Not provided",
    conformity: "Not provided",
    bidderResponse: specificationText || "Not provided",
  }];

  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-[#c8dce7]">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead className="bg-[#edf7fb] text-[#10283f]">
          <tr>
            <th className="w-[24%] border border-[#c8dce7] px-3 py-2 text-left">Description</th>
            <th className="w-[36%] border border-[#c8dce7] px-3 py-2 text-left">Required Specification</th>
            <th className="w-[14%] border border-[#c8dce7] px-3 py-2 text-center">Conformity</th>
            <th className="w-[26%] border border-[#c8dce7] px-3 py-2 text-left">Bidder Response</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.description}-${index}`} className="bg-white">
              <td className="break-words border border-[#c8dce7] px-3 py-2 align-top">{row.description || "Not provided"}</td>
              <td className="break-words border border-[#c8dce7] px-3 py-2 align-top">{row.requiredSpecification || "Not provided"}</td>
              <td className="break-words border border-[#c8dce7] px-3 py-2 text-center align-top font-bold">{row.conformity || "Not provided"}</td>
              <td className="break-words border border-[#c8dce7] px-3 py-2 align-top">{row.bidderResponse || "N/A"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function parseVendorDocuments(value) {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const documents = Array.isArray(parsed) ? parsed : parsed?.requiredDocuments;
    return Array.isArray(documents)
      ? documents.filter((document) => document?.dataUrl || document?.url)
      : [];
  } catch {
    return [];
  }
}

function buildReviewComment(item, decision, approved) {
  return [
    "BEC Member Review",
    "",
    "Quotation Details",
    `Vendor: ${item.vendorName || "Vendor"}`,
    `RFQ: ${item.rfqNumber || item.rfqId || "Not recorded"}`,
    `Category: ${item.category || "Not recorded"}`,
    "",
    "Preliminary Examination of Bids",
    `Completeness of quotation submission form: ${decision.completeness || "YES"}`,
    `Substantial responsiveness: ${decision.responsiveness || "YES"}`,
    `Accepted for detailed evaluation: ${decision.acceptedForEvaluation || "YES"}`,
    "",
    "Vendor Submitted Document Review",
    `Documents complete: ${decision.documentCompleteness || "YES"}`,
    `Document review comment: ${decision.documentComment || "No document issues recorded."}`,
    "",
    "Clarifications sought from bidders",
    decision.clarification || "No clarification requested.",
    "",
    "Departures from Technical Specifications",
    `Requirement: ${item.requiredSpecification || "No RR specification linked."}`,
    `Offered: ${item.vendorSpecification || "No vendor specification submitted."}`,
    `Departure remark: ${decision.departure || "No departure recorded."}`,
    "",
    "Evaluation of Responsive Bids",
    `Bid Price: ${formatMoney(item.quotedTotalPrice)}`,
    `Evaluated bid price: ${formatMoney(item.quotedTotalPrice)}`,
    "",
    "Item Technical Decision",
    decision.comment || (approved ? "Assigned BEC member approved this quotation item." : "Assigned BEC member rejected this quotation item."),
  ].join("\n");
}

export default function BecAssignedQuotations({ approvedOnly = false }) {
  const { token, user } = useAuth();
  const isBecMember = user?.mainRole === "FINANCE" && user?.subRole === "BEC";
  const [items, setItems] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [aiLoadingId, setAiLoadingId] = useState("");
  const [aiReviews, setAiReviews] = useState({});
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;

  const displayItems = useMemo(
    () => items.filter((item) => {
      const assignmentStatus = String(item.assignmentStatus || "").toUpperCase();
      const technicalStatus = String(item.technicalStatus || "").toUpperCase();
      if (approvedOnly) {
        return assignmentStatus
          ? assignmentStatus === "REVIEWED_APPROVED"
          : technicalStatus === "APPROVED";
      }
      return assignmentStatus
        ? assignmentStatus === "ASSIGNED"
        : technicalStatus === "PENDING";
    }),
    [approvedOnly, items]
  );

  useEffect(() => {
    if (!displayItems.some((item) => String(item.quotationItemId) === selectedItemId)) {
      setSelectedItemId("");
    }
  }, [displayItems, selectedItemId]);

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      if (approvedOnly) {
        const result = await procurementApi.quotations.myApprovedBecQuotations(token, page, pageSize);
        setItems(result?.content || []);
        setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
        setTotalItems(Number(result?.totalElements || 0));
      } else {
        const result = await procurementApi.quotations.myAssignedBecQuotations(token);
        setItems(Array.isArray(result) ? result : []);
      }
    } catch (err) {
      setError(err.message || "Could not load assigned quotations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isBecMember) loadItems();
  }, [token, isBecMember, approvedOnly, page]);

  const updateDecision = (itemId, patch) => {
    setDecisions((current) => ({
      ...current,
      [itemId]: {
        completeness: "YES",
        responsiveness: "YES",
        acceptedForEvaluation: "YES",
        documentCompleteness: "YES",
        documentComment: "",
        clarification: "",
        departure: "",
        comment: "",
        ...(current[itemId] || {}),
        ...patch,
      },
    }));
  };

  const reviewItem = async (item, approved) => {
    const decision = decisions[item.quotationItemId] || {};
    if (decision.documentCompleteness === "NO" && !decision.documentComment?.trim()) {
      const message = "Document issues mark karaddi missing document / issue comment eka required.";
      setError(message);
      toast.error(message, { autoClose: 5000 });
      return;
    }
    if (!approved && !decision.comment?.trim()) {
      setError("Reject karaddi item technical decision comment eka required.");
      return;
    }
    setSavingId(String(item.quotationItemId));
    setError("");
    setNotice("");
    try {
      await procurementApi.quotations.reviewAssignedBecItem(token, item.quotationItemId, {
        technicallyQualified: approved,
        evaluationComment: buildReviewComment(item, decision, approved),
      });
      setNotice(approved ? "Quotation item approved and sent to BEC Head vendor review list." : "Quotation item rejected and sent back with comment.");
      toast.success(approved ? "Quotation item approved and sent to BEC Head vendor review list." : "Quotation item rejected and sent back with comment.", { autoClose: 4500 });
      await loadItems();
    } catch (err) {
      setError(err.message || "Could not save BEC review.");
      toast.error(err.message || "Could not save BEC review.", { autoClose: 5000 });
    } finally {
      setSavingId("");
    }
  };

  const runAiReview = async (item) => {
    if (!item.quotationId) {
      setError("This assignment does not include a quotation ID for AI review.");
      return;
    }
    setAiLoadingId(String(item.quotationId));
    setError("");
    setNotice("");
    try {
      const review = await procurementApi.quotations.aiReview(token, item.quotationId);
      setAiReviews((current) => ({ ...current, [item.quotationId]: review }));
      const itemSuggestion = (review?.items || []).find(
        (entry) => String(entry.quotationItemId) === String(item.quotationItemId)
      );
      const suggestion = itemSuggestion?.recommendation || itemSuggestion?.summary || itemSuggestion?.reason;
      if (suggestion) updateDecision(item.quotationItemId, { comment: suggestion });
      setNotice("AI quotation review generated. Please verify the suggestion before making the final decision.");
      toast.success("AI quotation review generated. Please verify it before making the final decision.", { autoClose: 4500 });
    } catch (err) {
      setError(err.message || "Could not generate the AI quotation review.");
      toast.error(err.message || "Could not generate the AI quotation review.", { autoClose: 5000 });
    } finally {
      setAiLoadingId("");
    }
  };

  if (!isBecMember) {
    return (
      <div className="min-h-screen bg-[#f4f8fb] p-6">
        <h1 className="text-2xl font-black text-[#10283f]">BEC Member Access Required</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">Only normal BEC members can review assigned quotation categories here.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f8fb] p-6">
      <PageHero
        eyebrow="BEC Member"
        title={approvedOnly ? "Approved Quotation Reviews" : "Assigned Quotation Reviews"}
        description={approvedOnly
          ? "Review quotation items you have already technically approved."
          : "Select a pending assigned item to review quotation details, specification departures, and responsive bid checks."}
      />

      {notice && <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}
      {error && <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {loading && <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-600">Loading assigned quotations...</div>}
      {!loading && !displayItems.length && <div className={cardClass}>{approvedOnly ? "No approved quotation reviews." : "No pending assigned quotation reviews."}</div>}

      {!loading && displayItems.length > 0 && (
        <section className={`${cardClass} mb-5 mt-8`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">{approvedOnly ? "Approved items" : "Pending items"}</div>
            <div className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-bold text-[#166e8c]">{approvedOnly ? totalItems : displayItems.length} items</div>
          </div>
          {approvedOnly ? (
            <div className="overflow-x-auto rounded-2xl border border-[#dce8ef]">
              <table className="w-full min-w-[850px] border-collapse text-sm">
                <thead className="bg-[#edf7fb] text-left text-[11px] font-black uppercase tracking-[0.14em] text-[#166e8c]"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">RFQ</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Reviewed Date / Time</th></tr></thead>
                <tbody>
                  {displayItems.map((item) => (
                    <tr key={item.quotationItemId} onClick={() => { setSelectedItemId(String(item.quotationItemId)); requestAnimationFrame(() => document.getElementById("bec-assignment-details")?.scrollIntoView({ behavior: "smooth", block: "start" })); }} className={`cursor-pointer border-t border-[#e5eef3] transition ${selectedItemId === String(item.quotationItemId) ? "bg-[#e7f5fb]" : "bg-white hover:bg-[#f5fbfe]"}`}>
                      <td className="px-4 py-3 font-black text-[#10283f]">{item.requisitionItemName || "Quotation item"}</td><td className="px-4 py-3 text-slate-600">{item.vendorName || "Vendor"}</td><td className="px-4 py-3 text-slate-600">{item.rfqNumber || `RFQ ${item.rfqId}`}</td><td className="px-4 py-3 text-slate-600">{item.category || "Not recorded"}</td><td className="px-4 py-3"><StatusPill status={item.technicalStatus || item.assignmentStatus} /></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(item.updatedAt || item.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
          <div className="overflow-hidden rounded-2xl border border-[#dce8ef]">
            {displayItems.map((item) => (
              <button
                key={item.quotationItemId}
                type="button"
                onClick={() => {
                  setSelectedItemId(String(item.quotationItemId));
                  requestAnimationFrame(() => document.getElementById("bec-assignment-details")?.scrollIntoView({ behavior: "smooth", block: "start" }));
                }}
                className={`grid w-full gap-2 border-b border-[#e5eef3] px-4 py-3 text-left text-sm transition last:border-b-0 md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr] md:items-center ${selectedItemId === String(item.quotationItemId) ? "bg-[#e7f5fb]" : "bg-white hover:bg-[#f5fbfe]"}`}
              >
                <span className="font-black text-[#10283f]">{item.requisitionItemName || "Quotation item"}</span>
                <span className="truncate text-slate-600">{item.vendorName || "Vendor"}</span>
                <span className="text-slate-600">{item.rfqNumber || `RFQ ${item.rfqId}`}</span>
                <span className="md:text-right"><StatusPill status={item.technicalStatus || item.assignmentStatus} /></span>
              </button>
            ))}
          </div>
          )}
          {approvedOnly && <PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} alwaysShow />}
        </section>
      )}

      <div id="bec-assignment-details" className="scroll-mt-28 space-y-5">
        {displayItems.filter((item) => String(item.quotationItemId) === selectedItemId).map((item) => {
          const decision = decisions[item.quotationItemId] || {};
          const vendorDocuments = parseVendorDocuments(item.quotationDocuments);
          const saving = savingId === String(item.quotationItemId);
          const aiReview = aiReviews[item.quotationId];
          const aiLoading = aiLoadingId === String(item.quotationId);
          return (
            <section key={item.quotationItemId} className={cardClass}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Quotation Details</div>
                  <h2 className="mt-2 text-xl font-black text-[#10283f]">{item.vendorName || "Vendor"} - {item.requisitionItemName || "Quotation item"}</h2>
                  <div className="mt-2 text-sm leading-6 text-slate-600">
                    RFQ {item.rfqNumber || item.rfqId || "Not set"} | Category {item.category || "Not recorded"} | Submitted {formatDateTime(item.submittedAt)}
                  </div>
                </div>
                <StatusPill status={item.technicalStatus || item.assignmentStatus || "PENDING"} />
              </div>

              <div className="mt-5 rounded-2xl bg-[#edf7fb] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">University / RR and Vendor Specification Comparison</div>
                <p className="mt-1 text-xs text-slate-500">The first two columns show the university requirement; the remaining columns show the vendor response.</p>
                <VendorSpecificationTable specificationText={item.vendorSpecification} requiredSpecification={item.requiredSpecification} />
                <div className="mt-3 flex flex-wrap gap-4">
                  {item.requiredSpecificationDocumentUrl && <a className="text-sm font-bold text-[#166e8c]" href={item.requiredSpecificationDocumentUrl} target="_blank" rel="noreferrer">Open university spec document</a>}
                  {item.specificationDocumentUrl && <a className="text-sm font-bold text-[#166e8c]" href={item.specificationDocumentUrl} target="_blank" rel="noreferrer">Open vendor spec document</a>}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#dce8ef] bg-[#fbfdff] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Vendor Submitted Documents</div>
                    <p className="mt-1 text-xs text-slate-500">Documents saved by the vendor during quotation submission.</p>
                  </div>
                  <span className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-bold text-[#166e8c]">{vendorDocuments.length} documents</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-xl border border-[#dce8ef] bg-white">
                  {vendorDocuments.length ? vendorDocuments.map((document, index) => {
                    const documentUrl = document.dataUrl || document.url;
                    return (
                      <div key={`${document.label || document.fileName}-${index}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5eef3] px-4 py-3 last:border-b-0">
                        <div className="min-w-0">
                          <div className="font-bold text-[#10283f]">{document.label || `Document ${index + 1}`}</div>
                          <div className="truncate text-xs text-slate-500">{document.fileName || "Uploaded document"}</div>
                        </div>
                        <div className="flex gap-2">
                          <a href={documentUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-[#166e8c] px-3 py-2 text-xs font-bold text-[#166e8c]">View</a>
                          <a href={documentUrl} download={document.fileName || `vendor-document-${index + 1}`} className="rounded-xl bg-[#166e8c] px-3 py-2 text-xs font-bold text-white">Download</a>
                        </div>
                      </div>
                    );
                  }) : <div className="px-4 py-4 text-sm text-slate-500">No reusable vendor documents were saved for this quotation.</div>}
                </div>
                {!approvedOnly && (
                  <div className="mt-4 grid gap-3 lg:grid-cols-[260px_1fr]">
                    <select className={inputClass} value={decision.documentCompleteness || "YES"} onChange={(e) => updateDecision(item.quotationItemId, { documentCompleteness: e.target.value })}>
                      <option value="YES">Documents: Complete</option>
                      <option value="NO">Documents: Has issues</option>
                    </select>
                    <textarea className={`${inputClass} min-h-[84px]`} value={decision.documentComment || ""} onChange={(e) => updateDecision(item.quotationItemId, { documentComment: e.target.value })} placeholder="Missing documents, issues, or review comment" />
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#dce8ef] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Preliminary Examination of Bids</div>
                  <div className="mt-3 grid gap-3">
                    <select className={inputClass} value={decision.completeness || "YES"} onChange={(e) => updateDecision(item.quotationItemId, { completeness: e.target.value })}>
                      <option value="YES">Completeness: YES</option>
                      <option value="NO">Completeness: NO</option>
                    </select>
                    <select className={inputClass} value={decision.responsiveness || "YES"} onChange={(e) => updateDecision(item.quotationItemId, { responsiveness: e.target.value })}>
                      <option value="YES">Substantial responsiveness: YES</option>
                      <option value="NO">Substantial responsiveness: NO</option>
                    </select>
                    <select className={inputClass} value={decision.acceptedForEvaluation || "YES"} onChange={(e) => updateDecision(item.quotationItemId, { acceptedForEvaluation: e.target.value })}>
                      <option value="YES">Accepted for detailed evaluation: YES</option>
                      <option value="NO">Accepted for detailed evaluation: NO</option>
                    </select>
                  </div>
                </div>
                <div className="rounded-2xl border border-[#dce8ef] bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Clarifications sought from bidders</div>
                  <textarea className={`${inputClass} mt-3 min-h-[120px]`} value={decision.clarification || ""} onChange={(e) => updateDecision(item.quotationItemId, { clarification: e.target.value })} placeholder="Clarification notes, if any" />
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#dce8ef] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Departures from Technical Specifications</div>
                <textarea className={`${inputClass} mt-3 min-h-[110px]`} value={decision.departure || ""} onChange={(e) => updateDecision(item.quotationItemId, { departure: e.target.value })} placeholder="Requirement vs offered departures and remarks" />
              </div>

              <div className="mt-5 rounded-2xl border border-[#dce8ef] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Evaluation of Responsive Bids</div>
                <div className="mt-3 grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                  <div>Unit price <span className="font-black text-[#10283f]">{formatMoney(item.quotedUnitPrice)}</span></div>
                  <div>Qty <span className="font-black text-[#10283f]">{item.quantity ?? "Not set"}</span></div>
                  <div>Total <span className="font-black text-[#10283f]">{formatMoney(item.quotedTotalPrice)}</span></div>
                </div>
              </div>

              {!approvedOnly && <div className="mt-5 rounded-2xl border border-[#cfe1eb] bg-[#edf7fb] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">AI-assisted review</div>
                    <div className="mt-1 text-sm text-slate-600">Compare the quotation with the required specifications using the configured Gemini model.</div>
                  </div>
                  <button type="button" disabled={aiLoading || !item.quotationId} onClick={() => runAiReview(item)} className={`${buttonClass} bg-[#166e8c] hover:bg-[#105873]`}>
                    {aiLoading ? "Running AI Review..." : "Run AI Review"}
                  </button>
                </div>
                {aiReview && (
                  <div className="mt-4 rounded-xl border border-[#c8dce7] bg-white p-4">
                    <div className="font-black text-[#10283f]">{aiReview.summary || "AI review completed."}</div>
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Status {aiReview.overallStatus || "REVIEWED"} | Model {aiReview.model || "Gemini"} | Reviewed {formatDateTime(aiReview.reviewedAt)}
                    </div>
                  </div>
                )}
              </div>}

              {!approvedOnly && <div className="mt-5 rounded-2xl border border-[#dce8ef] bg-[#fbfdff] p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Item Technical Decision</div>
                <textarea className={`${inputClass} mt-3 min-h-[130px]`} value={decision.comment || ""} onChange={(e) => updateDecision(item.quotationItemId, { comment: e.target.value })} placeholder="Add final technical comment" />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" disabled={saving} onClick={() => reviewItem(item, true)} className={`${buttonClass} bg-emerald-600 hover:bg-emerald-700`}>
                    {saving ? "Saving..." : "Approve Quotation Item"}
                  </button>
                  <button type="button" disabled={saving} onClick={() => reviewItem(item, false)} className={`${buttonClass} bg-red-600 hover:bg-red-700`}>
                    {saving ? "Saving..." : "Reject Quotation Item"}
                  </button>
                </div>
              </div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}
