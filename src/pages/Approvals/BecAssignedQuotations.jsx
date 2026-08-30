import { useEffect, useMemo, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime, formatMoney } from "../../services/apiClient";

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

function VendorSpecificationTable({ specificationText }) {
  const rows = parseVendorSpecificationRows(specificationText);
  if (!rows.length) return <div className="mt-2 text-sm text-slate-600">Vendor specification text is not available.</div>;

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

export default function BecAssignedQuotations() {
  const { token, user } = useAuth();
  const isBecMember = user?.mainRole === "FINANCE" && user?.subRole === "BEC";
  const [items, setItems] = useState([]);
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const pendingItems = useMemo(
    () => items.filter((item) => item.assignmentStatus === "ASSIGNED" || item.technicalStatus === "PENDING"),
    [items]
  );

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await procurementApi.quotations.myAssignedBecQuotations(token));
    } catch (err) {
      setError(err.message || "Could not load assigned quotations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && isBecMember) loadItems();
  }, [token, isBecMember]);

  const updateDecision = (itemId, patch) => {
    setDecisions((current) => ({
      ...current,
      [itemId]: {
        completeness: "YES",
        responsiveness: "YES",
        acceptedForEvaluation: "YES",
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
      await loadItems();
    } catch (err) {
      setError(err.message || "Could not save BEC review.");
    } finally {
      setSavingId("");
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
        title="Assigned Quotation Reviews"
        description="Review quotation details, specification departures, and responsive bid checks for categories assigned by the BEC Head."
      />

      {notice && <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}
      {error && <div className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {loading && <div className="mb-4 rounded-2xl bg-white p-4 text-sm font-semibold text-slate-600">Loading assigned quotations...</div>}
      {!loading && !pendingItems.length && <div className={cardClass}>No pending assigned quotation reviews.</div>}

      <div className="space-y-5">
        {pendingItems.map((item) => {
          const decision = decisions[item.quotationItemId] || {};
          const saving = savingId === String(item.quotationItemId);
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

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">University / RR Specification</div>
                  <div className="mt-2 text-sm leading-7 text-slate-700">{item.requiredSpecification || "No RR specification linked."}</div>
                  {item.requiredSpecificationDocumentUrl && <a className="mt-3 inline-block text-sm font-bold text-[#166e8c]" href={item.requiredSpecificationDocumentUrl} target="_blank" rel="noreferrer">Open university spec document</a>}
                </div>
                <div className="rounded-2xl bg-[#edf7fb] p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">Vendor Specification</div>
                  <VendorSpecificationTable specificationText={item.vendorSpecification} />
                  {item.specificationDocumentUrl && <a className="mt-3 inline-block text-sm font-bold text-[#166e8c]" href={item.specificationDocumentUrl} target="_blank" rel="noreferrer">Open vendor spec document</a>}
                </div>
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

              <div className="mt-5 rounded-2xl border border-[#dce8ef] bg-[#fbfdff] p-4">
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
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
