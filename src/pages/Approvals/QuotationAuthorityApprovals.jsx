import { useCallback, useEffect, useMemo, useState } from "react";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime, formatMoney } from "../../services/apiClient";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";
const buttonClass = "inline-flex items-center justify-center rounded-2xl bg-[#166e8c] px-4 py-2 text-sm font-black text-white hover:bg-[#145f79] disabled:cursor-not-allowed disabled:bg-slate-300";
const rejectButtonClass = "inline-flex items-center justify-center rounded-2xl bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300";

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
  if (authority === "DPC") return "After Dean and VC approval above LKR 1,000,000";
  return "Price based approval";
};

export default function QuotationAuthorityApprovals() {
  const { token, user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const authority = authorityForUser(user);

  const load = useCallback(async () => {
    if (!token || !authority) return;
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.offers.pendingAuthority(token);
      setOffers(getArray(data));
    } catch (loadError) {
      setError(loadError.message || "Could not load quotation approvals.");
    } finally {
      setLoading(false);
    }
  }, [token, authority]);

  useEffect(() => {
    load();
  }, [load]);

  const totalValue = useMemo(
    () => offers.reduce((sum, offer) => sum + Number(offer.offerAmount || 0), 0),
    [offers]
  );

  const decide = async (offer, decision) => {
    const comment = comments[offer.offerLetterId] || "";
    if (decision === "REJECTED" && !comment.trim()) {
      setError("Rejection comment is required.");
      return;
    }
    setSubmittingId(String(offer.offerLetterId));
    setError("");
    setMessage("");
    try {
      await procurementApi.offers.decideAuthority(token, offer.offerLetterId, {
        decision,
        comment: comment || `${authority} ${decision.toLowerCase()} quotation approval`,
      });
      setMessage(decision === "APPROVED" ? "Quotation approval saved. Higher value quotations will move to the next authority." : "Quotation approval rejected.");
      setComments((current) => ({ ...current, [offer.offerLetterId]: "" }));
      await load();
    } catch (decisionError) {
      setError(decisionError.message || "Could not save approval decision.");
    } finally {
      setSubmittingId("");
    }
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
          <div className="mt-2 text-3xl font-black">{offers.length}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {message && <div className="rounded-[24px] bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{message}</div>}

      <section className={cardClass}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Pending Authority Approval</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">Selected vendor quotations</h2>
            <div className="mt-2 text-sm leading-7 text-slate-600">
              {offers.length} quotation{offers.length === 1 ? "" : "s"} | Total value {formatMoney(totalValue)}
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
          {offers.map((offer) => {
            const isSubmitting = submittingId === String(offer.offerLetterId);
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

                {offer.letterContent && (
                  <pre className="mt-5 max-h-[260px] overflow-auto whitespace-pre-wrap rounded-[20px] bg-white p-4 text-sm leading-7 text-slate-700">{offer.letterContent}</pre>
                )}

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
                      {isSubmitting ? "Saving..." : "Approve"}
                    </button>
                  </div>
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
