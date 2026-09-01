import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
import PaginationControls, { usePagination } from "../../components/PaginationControls";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import { deanPath } from "../../utils/roleRoutes";
import { requestDisplayName } from "../../utils/procurementDisplay";

const wasApprovedByDean = (request) => (request.approvalHistory || []).some(
  (entry) => entry.actionRole === "DEAN" && entry.action === "APPROVED"
);

const outsideProcurementPlan = (request) => request?.description
  ?.split(/\r?\n/)
  .some((line) => /^included in procurement plan:\s*no\s*$/i.test(line.trim()));

const deanSentToVc = (request) => (request.approvalHistory || []).some(
  (entry) => entry.actionRole === "DEAN" && entry.action === "APPROVED" && entry.toStatus === "SUBMITTED_TO_VC"
);

export default function DeanAuditTrail() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const detailsRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(requests);

  const load = () => {
    setLoading(true);
    setError("");
    apiRequest("/api/approvals/dean/audit-trail?page=0&size=100", { token })
      .then((data) => setRequests((data?.content || []).filter(wasApprovedByDean)))
      .catch((err) => setError(err.message || "Could not load Dean audit trail."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (token) load();
  }, [token]);

  const selectRequest = (request) => {
    setSelected(request);
    window.requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const lowValueVcRoute = selected
    && Number(selected.estimatedTotalAmount || 0) <= 500000
    && outsideProcurementPlan(selected)
    && deanSentToVc(selected);

  return (
    <div className="space-y-8">
      <PageHero eyebrow="Dean Workspace" title="Approved RR Audit Trail" description="Review requisitions approved by the Dean and the workflow destination selected by the backend rules." />
      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="space-y-6">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Approved RR List</div>
              <div className="mt-1 text-sm text-slate-500">{requests.length} Dean-approved requisition{requests.length === 1 ? "" : "s"}</div>
            </div>
            <button type="button" onClick={load} className="rounded-xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c]">Refresh</button>
          </div>
          <div className="mt-5 space-y-3">
            {loading && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Loading approved RRs...</div>}
            {!loading && requests.length === 0 && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No Dean-approved RRs found.</div>}
            {pageItems.map((request) => (
              <button key={request.rrId} type="button" onClick={() => selectRequest(request)} className={`w-full rounded-[20px] border p-4 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#e1ebf0] bg-white hover:bg-[#f8fcff]"}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2"><span className="font-bold text-[#10283f]">{requestDisplayName(request)}</span><StatusPill status={request.status} /></div>
                    <div className="mt-1 text-xs text-slate-500">{request.rrNumber} · Updated {formatDateTime(request.updatedAt)}</div>
                  </div>
                  <div className="text-sm font-bold text-[#166e8c]">{formatMoney(request.estimatedTotalAmount)}</div>
                </div>
              </button>
            ))}
          </div>
          <PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={requests.length} pageSize={pageSize} />
        </div>

        {selected && (
          <div ref={detailsRef} className="scroll-mt-24 rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RR Details</div>
            {lowValueVcRoute && (
              <div className="mt-5 rounded-[22px] border border-amber-300 bg-amber-50 p-5">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Low-value RR routed to VC</div>
                <div className="mt-1 text-sm font-bold text-[#6f4808]">Included in procurement plan: No</div>
                <p className="mt-2 text-sm leading-6 text-amber-900/80">Although this RR is LKR 500,000 or less, VC approval is required because it is outside the procurement plan.</p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="text-2xl font-black text-[#10283f]">{requestDisplayName(selected)}</h2><div className="mt-2 text-sm text-slate-600">{selected.rrNumber} · {statusLabel(selected.status)}</div></div>
              <button type="button" onClick={() => navigate(`${deanPath("approvals")}/${selected.rrId}`)} className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]">View Details</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Detail label="Requested By" value={selected.requestedByName || "Staff member"} />
              <Detail label="Division" value={selected.divisionName || "Not recorded"} />
              <Detail label="Estimated Total" value={formatMoney(selected.estimatedTotalAmount)} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Detail({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-4"><div className="text-xs font-bold uppercase tracking-[0.14em] text-[#166e8c]">{label}</div><div className="mt-2 text-sm font-bold text-[#10283f]">{value}</div></div>;
}
