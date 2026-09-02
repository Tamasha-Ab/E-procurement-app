import { useEffect, useState } from "react";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { vendorApi } from "../../api/vendorApi";
import { formatDateTime, formatMoney } from "../../services/apiClient";
import { toast } from "react-toastify";

const isPdf = (value) => typeof value === "string" && value.startsWith("data:application/pdf");

export default function VendorOfferLetters() {
  const [offers, setOffers] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    vendorApi.offers.list()
      .then((data) => setOffers(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Could not load received offer letters."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const respond = async (offer, decision) => {
    setBusyId(String(offer.offerLetterId));
    try {
      await vendorApi.offers.respond(offer.offerLetterId, { decision, comment: comments[offer.offerLetterId] || "" });
      toast.success(`Offer letter ${decision === "ACCEPTED" ? "accepted" : "rejected"} successfully.`, { autoClose: 4000 });
      await load();
    } catch (err) {
      toast.error(err.message || "Could not save the offer response.", { autoClose: 5000 });
    } finally {
      setBusyId("");
    }
  };

  return (
    <div className="space-y-7">
      <PageHero eyebrow="Vendor Workspace" title="Received Offer Letters" description="Review offer letters sent to your vendor account and submit an acceptance or rejection response." />
      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      <section className="rounded-[26px] border border-[#dce8ef] bg-white p-5 shadow-[0_16px_38px_rgba(15,41,64,0.06)]">
        <div className="mb-4 flex items-center justify-between"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Offer letter inbox</div><span className="rounded-full bg-[#edf7fb] px-3 py-2 text-xs font-bold text-[#166e8c]">{offers.length} received</span></div>
        <div className="overflow-hidden rounded-2xl border border-[#dce8ef]">
          {loading && <div className="p-4 text-sm text-slate-600">Loading offer letters...</div>}
          {!loading && !offers.length && <div className="p-4 text-sm text-slate-600">No offer letters received yet.</div>}
          {offers.map((offer) => {
            const expanded = expandedId === offer.offerLetterId;
            const responded = ["ACCEPTED_BY_VENDOR", "REJECTED_BY_VENDOR"].includes(offer.status);
            return <article key={offer.offerLetterId} className="border-b border-[#e5eef3] last:border-b-0">
              <button type="button" onClick={() => setExpandedId(expanded ? null : offer.offerLetterId)} className="grid w-full gap-2 px-4 py-3 text-left text-sm hover:bg-[#f5fbfe] md:grid-cols-[0.9fr_1.2fr_0.8fr_0.9fr_auto] md:items-center"><span className="font-bold text-[#166e8c]">{offer.letterNumber || `Offer ${offer.offerLetterId}`}</span><span className="font-black text-[#10283f]">{offer.requisitionItemName || offer.rfqNumber || "Offer letter"}</span><span className="font-bold text-[#10283f]">{formatMoney(offer.itemOfferAmount || offer.offerAmount)}</span><span><StatusPill status={offer.status || "SENT_TO_VENDOR"} /></span><ExpandMoreRoundedIcon className={`text-[#166e8c] transition-transform ${expanded ? "rotate-180" : ""}`} /></button>
              {expanded && <div className="border-t border-[#e5eef3] bg-[#fbfdff] p-5"><div className="grid gap-3 md:grid-cols-3"><Info label="RFQ" value={offer.rfqNumber || offer.rfqId} /><Info label="Approval Authority" value={offer.approvalAuthority} /><Info label="Received / Updated" value={formatDateTime(offer.updatedAt || offer.createdAt)} /></div><div className="mt-4 rounded-2xl bg-white p-4">{isPdf(offer.letterContent) ? <div className="flex gap-3"><button type="button" onClick={() => window.open(offer.letterContent, "_blank", "noopener,noreferrer")} className="rounded-xl bg-[#166e8c] px-4 py-2 text-sm font-bold text-white">View Offer Letter PDF</button><a href={offer.letterContent} download={`Offer-Letter-${offer.letterNumber || offer.offerLetterId}.pdf`} className="rounded-xl border border-[#dce8ef] px-4 py-2 text-sm font-bold text-[#166e8c]">Download PDF</a></div> : <pre className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{offer.letterContent || "No letter content available."}</pre>}</div>{!responded && <div className="mt-4"><textarea value={comments[offer.offerLetterId] || ""} onChange={(e) => setComments((current) => ({ ...current, [offer.offerLetterId]: e.target.value }))} placeholder="Response comment" className="min-h-24 w-full rounded-2xl border border-[#dce8ef] p-4 text-sm outline-none focus:border-[#166e8c]" /><div className="mt-3 flex gap-3"><button disabled={busyId === String(offer.offerLetterId)} onClick={() => respond(offer, "ACCEPTED")} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Accept Offer</button><button disabled={busyId === String(offer.offerLetterId)} onClick={() => respond(offer, "REJECTED")} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Reject Offer</button></div></div>}</div>}
            </article>;
          })}
        </div>
      </section>
    </div>
  );
}

function Info({ label, value }) {
  return <div className="rounded-2xl bg-white p-4"><div className="text-xs font-semibold uppercase tracking-[0.14em] text-[#166e8c]">{label}</div><div className="mt-2 text-sm font-bold text-[#10283f]">{value || "Not recorded"}</div></div>;
}
