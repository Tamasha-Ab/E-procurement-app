import { useEffect, useState } from "react";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatMoney } from "../../services/apiClient";

export default function ApprovalQueue({ roleKey, title, description, pendingUrl, actionBaseUrl }) {
  const { token } = useAuth();
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const loadRequests = () => {
    setIsLoading(true);
    setError("");
    apiRequest(`${pendingUrl}?page=0&size=20`, { token })
      .then((data) => setRequests(data?.content || []))
      .catch((err) => setError(err.message || "Could not load pending requests."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadRequests();
  }, [pendingUrl, token]);

  const performAction = async (action) => {
    if (!selected) return;
    setError("");
    setMessage("");
    setIsActing(true);

    try {
      await apiRequest(`${actionBaseUrl}/${selected.rrId}/${action}`, {
        token,
        method: "POST",
        body: { comment },
      });
      setMessage(`${selected.rrNumber} ${action} completed.`);
      setSelected(null);
      setComment("");
      loadRequests();
    } catch (err) {
      setError(err.message || `Could not ${action} request.`);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHero eyebrow="Approval Workflow" title={title} description={description}>
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Pending</div>
          <div className="mt-2 text-3xl font-black">{requests.length}</div>
        </div>
      </PageHero>

      {(message || error) && (
        <div className={`rounded-[24px] p-4 text-sm font-semibold ${error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {error || message}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">{roleKey} Queue</div>
          <div className="mt-6 space-y-4">
            {isLoading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading pending requests...</div>}
            {!isLoading && requests.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No pending requests.</div>}
            {requests.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => {
                  setSelected(request);
                  setComment("");
                }}
                className={`w-full rounded-[26px] border p-5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-black text-[#10283f]">{request.title}</h3>
                  <StatusPill status={request.status} />
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {request.rrNumber} | {request.departmentName} | {formatMoney(request.estimatedTotalAmount)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Decision Panel</div>
          {!selected ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select a pending request to approve, reject, or return.</div>
          ) : (
            <div className="mt-6 space-y-5">
              <div>
                <h3 className="text-2xl font-black text-[#10283f]">{selected.title}</h3>
                <div className="mt-2 text-sm leading-7 text-slate-600">{selected.justification || "No justification provided."}</div>
              </div>

              <label className="space-y-2 block">
                <span className="text-sm font-bold text-[#10283f]">Decision comment</span>
                <textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={5} className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 outline-none focus:border-[#166e8c]" />
              </label>

              <div className="grid gap-3 md:grid-cols-3">
                <button disabled={isActing} onClick={() => performAction("approve")} className="rounded-2xl bg-[#166e8c] px-4 py-3 font-bold text-white hover:bg-[#145f79] disabled:opacity-60">Approve</button>
                <button disabled={isActing} onClick={() => performAction("reject")} className="rounded-2xl bg-red-600 px-4 py-3 font-bold text-white hover:bg-red-700 disabled:opacity-60">Reject</button>
                <button disabled={isActing} onClick={() => performAction("return")} className="rounded-2xl bg-[#0f2940] px-4 py-3 font-bold text-white hover:bg-[#173b5a] disabled:opacity-60">Return</button>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
