import { useEffect, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatMoney } from "../../services/apiClient";

const initialReview = {
  specificationText: "",
  attachmentUrl: "",
  recommendedProcurementMethod: "RFQ",
  comment: "",
};

export default function TecApprovals() {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [review, setReview] = useState(initialReview);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRequests = () => {
    setIsLoading(true);
    setError("");
    apiRequest("/api/approvals/tec/pending?page=0&size=20", { token })
      .then((data) => setRequests(data?.content || []))
      .catch((err) => setError(err.message || "Could not load TEC pending requests."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, [token]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setReview((current) => ({ ...current, [name]: value }));
  };

  const submitReview = async (event) => {
    event.preventDefault();
    if (!selected) return;
    setError("");
    setMessage("");
    setIsSubmitting(true);

    try {
      await apiRequest(`/api/approvals/tec/${selected.rrId}/review`, {
        token,
        method: "POST",
        body: review,
      });
      setMessage(`${selected.rrNumber} reviewed and submitted to VC.`);
      setSelected(null);
      setReview(initialReview);
      loadRequests();
    } catch (err) {
      setError(err.message || "Could not complete TEC review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Technical Review"
        title="TEC Reviews"
        description="Add technical specifications, recommend a procurement method, and submit reviewed requests to VC."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Pending Reviews</div>
          <div className="mt-2 text-3xl font-black">{requests.length}</div>
        </div>
      </PageHero>

      {(message || error) && (
        <div className={`rounded-[24px] p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">TEC Queue</div>
          <div className="mt-6 space-y-4">
            {isLoading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading pending reviews...</div>}
            {!isLoading && requests.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No pending technical reviews.</div>}
            {requests.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => {
                  setSelected(request);
                  setReview(initialReview);
                }}
                className={`w-full rounded-[26px] border p-5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-[#10283f]">{request.title}</h3>
                  <StatusPill status={request.status} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {request.rrNumber} | {request.facultyName} | {formatMoney(request.estimatedTotalAmount)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submitReview} className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Specification Form</div>
          {!selected ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select a request to add technical specifications.</div>
          ) : (
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-2xl font-black text-[#10283f]">{selected.title}</h3>
                <div className="mt-2 text-sm leading-7 text-slate-600">{selected.description || selected.justification || "No request detail provided."}</div>
              </div>

              <label className="space-y-2 block">
                <span className="text-sm font-bold text-[#10283f]">Technical specification</span>
                <textarea name="specificationText" value={review.specificationText} onChange={updateField} rows={6} required className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-bold text-[#10283f]">Attachment URL</span>
                <input name="attachmentUrl" value={review.attachmentUrl} onChange={updateField} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-bold text-[#10283f]">Procurement method</span>
                <select name="recommendedProcurementMethod" value={review.recommendedProcurementMethod} onChange={updateField} className="w-full rounded-2xl border border-[#dce8ef] bg-white px-4 py-3 outline-none focus:border-[#166e8c]">
                  <option value="RFQ">RFQ</option>
                  <option value="OPEN_COMPETITIVE_BIDDING">Open Competitive Bidding</option>
                  <option value="NATIONAL_COMPETITIVE_BIDDING">National Competitive Bidding</option>
                </select>
              </label>

              <label className="space-y-2 block">
                <span className="text-sm font-bold text-[#10283f]">Review comment</span>
                <textarea name="comment" value={review.comment} onChange={updateField} rows={3} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
              </label>

              <button disabled={isSubmitting} type="submit" className="w-full rounded-2xl bg-[#166e8c] px-5 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">
                {isSubmitting ? "Submitting..." : "Complete Review and Send to VC"}
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}
