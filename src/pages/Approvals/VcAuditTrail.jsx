import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PageHero from "../../components/PageHero";
import PaginationControls from "../../components/PaginationControls";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import { requestDisplayName } from "../../utils/procurementDisplay";
import { vcPath } from "../../utils/roleRoutes";

const PAGE_SIZE = 10;

export default function VcAuditTrail() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const detailsRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    apiRequest(`/api/approvals/vc/audit-trail?page=${page}&size=${PAGE_SIZE}`, { token })
      .then((data) => {
        setRequests(data?.content || []);
        setTotalPages(Math.max(1, data?.totalPages || 1));
        setTotalItems(data?.totalElements || 0);
      })
      .catch((err) => setError(err.message || "Could not load VC audit trail."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (token) load(); }, [token, page]);

  const selectRequest = (request) => {
    setSelected(request);
    window.requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="space-y-8">
      <PageHero eyebrow="VC Workspace" title="Approved RR Audit Trail" description="Review requisitions processed by the Vice Chancellor and their current workflow status." />
      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6eef3] px-5 py-3">
            <div><div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">VC RR List</div><div className="mt-1 text-sm text-slate-500">{totalItems} processed requisition{totalItems === 1 ? "" : "s"}</div></div>
            <button type="button" onClick={load} className="rounded-xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c]">Refresh</button>
          </div>
          <div className="space-y-3 overflow-x-auto p-5">
            <div className="grid min-w-[1040px] grid-cols-[48px_220px_220px_130px_170px_210px] gap-1 rounded-xl bg-[#f5fbff] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#166e8c]"><span /><span>RR</span><span>Details</span><span>Amount</span><span>Status</span><span className="pl-10">Date / Time</span></div>
            {loading && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Loading VC audit trail...</div>}
            {!loading && requests.length === 0 && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No VC-processed RRs found.</div>}
            {requests.map((request) => (
              <button key={request.rrId} type="button" onClick={() => selectRequest(request)} className={`grid min-w-[1040px] w-full grid-cols-[48px_220px_220px_130px_170px_210px] items-center gap-1 rounded-xl border px-3 py-2.5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}>
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf7fb] text-[#166e8c]"><HistoryRoundedIcon sx={{ fontSize: 17 }} /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-bold text-[#10283f]">{requestDisplayName(request)}</span><span className="mt-0.5 block truncate text-[10px] font-semibold text-[#166e8c]">{request.rrNumber}</span></span>
                <span className="truncate text-xs text-slate-600">{[request.requestedByName || "Staff member", request.divisionName].filter(Boolean).join(" / ")}</span>
                <span className="whitespace-nowrap text-xs font-bold text-[#10283f]">{formatMoney(request.estimatedTotalAmount)}</span>
                <span><StatusPill status={request.status} /></span>
                <span className="whitespace-nowrap border-l border-[#dce8ef] pl-10 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#166e8c]">{formatDateTime(request.updatedAt)}</span>
              </button>
            ))}
          </div>
          <div className="px-5 pb-5"><PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} /></div>
        </div>

        {selected && (
          <div ref={detailsRef} className="scroll-mt-24 rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RR Details</div>
            <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
              <div><h2 className="text-2xl font-black text-[#10283f]">{requestDisplayName(selected)}</h2><div className="mt-2 text-sm text-slate-600">{selected.rrNumber} · {statusLabel(selected.status)}</div></div>
              <button type="button" onClick={() => navigate(`${vcPath("approvals")}/${selected.rrId}`)} className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]">View Details</button>
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
