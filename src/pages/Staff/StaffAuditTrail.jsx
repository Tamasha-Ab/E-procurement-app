import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PageHero from "../../components/PageHero";
import PaginationControls from "../../components/PaginationControls";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import { requestDisplayName, requestContext } from "../../utils/procurementDisplay";
import { staffMemberPath } from "../../utils/roleRoutes";

export default function StaffAuditTrail() {
  const PAGE_SIZE = 10;
  const { token } = useAuth();
  const navigate = useNavigate();
  const timelineRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(0); }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadAuditTrail = () => {
    setIsLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    apiRequest(`/api/staff/requisitions/audit-trail?${params}`, { token })
      .then((data) => {
        const list = data?.content || [];
        setRequests(list);
        setTotalItems(data?.totalElements || 0);
        setTotalPages(Math.max(1, data?.totalPages || 1));
        setSelected((current) => current ? list.find((item) => item.rrId === current.rrId) || null : null);
      })
      .catch((err) => setError(err.message || "Could not load staff audit trail."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (token) loadAuditTrail();
  }, [token, page, debouncedSearch, fromDate, toDate]);

  const selectRequest = (request) => {
    setSelected(request);
    window.requestAnimationFrame(() => {
      timelineRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Staff Workspace"
        title="Audit Trail"
        description="Track your requisition requests from draft submission through every approval action and comment."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Records</div>
          <div className="mt-2 text-3xl font-black">{totalItems}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="space-y-6">
        <div className="overflow-hidden rounded-[30px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex items-center justify-between gap-3 border-b border-[#e6eef3] px-5 py-3">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">My RR List</div>
            <button type="button" onClick={loadAuditTrail} className="rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
              Refresh
            </button>
          </div>

          <div className="m-5 grid gap-3 rounded-xl border border-[#dce8ef] bg-[#f8fcff] p-3 md:grid-cols-[minmax(260px,1fr)_170px_170px_auto] md:items-center">
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search RR number, title, item or status" className="rounded-xl border border-[#d3e3eb] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#166e8c]" />
            <input type="date" aria-label="From date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(0); }} className="rounded-xl border border-[#d3e3eb] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-[#166e8c]" />
            <input type="date" aria-label="To date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(0); }} className="rounded-xl border border-[#d3e3eb] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-[#166e8c]" />
            <button type="button" onClick={() => { setSearch(""); setDebouncedSearch(""); setFromDate(""); setToDate(""); setPage(0); }} className="rounded-xl border border-[#bcd5e1] bg-white px-4 py-2.5 text-xs font-black text-[#166e8c]">Clear filters</button>
          </div>

          <div className="space-y-3 overflow-x-auto px-5 pb-5">
            <div className="grid min-w-[1040px] grid-cols-[48px_220px_220px_130px_170px_210px] gap-1 rounded-xl bg-[#f5fbff] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#166e8c]">
              <span></span><span>RR</span><span>Details</span><span>Amount</span><span>Status</span><span className="pl-10">Date / Time</span>
            </div>
            {isLoading && <div className="p-5 text-sm text-slate-600">Loading audit trail...</div>}
            {!isLoading && requests.length === 0 && <div className="p-5 text-sm text-slate-600">No audit records found.</div>}
            {requests.map((request) => (
              <button
                key={request.rrId}
                type="button"
                onClick={() => selectRequest(request)}
                className={`grid min-w-[1040px] w-full grid-cols-[48px_220px_220px_130px_170px_210px] items-center gap-1 rounded-xl border px-3 py-2.5 text-left transition ${selected?.rrId === request.rrId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"}`}
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#edf7fb] text-[#166e8c]"><HistoryRoundedIcon sx={{ fontSize: 17 }} /></span>
                <h3 className="truncate text-sm font-bold text-[#10283f]">{requestDisplayName(request)}</h3>
                <div className="truncate text-xs text-slate-600">{requestContext(request) || "Request"}</div>
                <div className="whitespace-nowrap text-xs font-bold text-[#10283f]">{formatMoney(request.estimatedTotalAmount)}</div>
                <div><StatusPill status={request.status} /></div>
                <span className="whitespace-nowrap border-l border-[#dce8ef] pl-10 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#166e8c]">{formatDateTime(request.updatedAt)}</span>
              </button>
            ))}
          </div>
          <div className="px-5 pb-5"><PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} alwaysShow /></div>
        </div>

        <div ref={timelineRef} className="scroll-mt-24 rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Timeline</div>
          {!selected ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select an RR to view its timeline.</div>
          ) : (
            <div className="mt-6 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-black text-[#10283f]">{requestDisplayName(selected)}</h2>
                  <StatusPill status={selected.status} />
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-600">Review the request summary and approval history below, or open the complete RR form for all submitted information.</p>
                <button
                  type="button"
                  onClick={() => navigate(`${staffMemberPath("my-requisitions")}/${selected.rrId}`)}
                  className="mt-4 rounded-2xl bg-[#166e8c] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#125d77]"
                >
                  View Details
                </button>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailTile label="Request Name" value={requestDisplayName(selected)} />
                <DetailTile label="Stage" value={statusLabel(selected.currentStage)} />
                <DetailTile label="Division" value={selected.divisionName || "Not recorded"} />
                <DetailTile label="Estimated Total" value={formatMoney(selected.estimatedTotalAmount)} />
              </div>

              <section className="rounded-[24px] border border-[#dce8ef] bg-white p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Approval Timeline</div>
                <div className="mt-4 space-y-3">
                  {(selected.approvalHistory || []).length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">No timeline entries recorded yet.</div>
                  )}
                  {(selected.approvalHistory || []).map((entry, index) => (
                    <div key={entry.approvalId || index} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#0f2940] text-white">
                        <HistoryRoundedIcon fontSize="small" />
                      </div>
                      <div>
                        <div className="font-bold text-[#10283f]">{statusLabel(entry.action)} by {statusLabel(entry.actionRole)}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-600">
                          {statusLabel(entry.fromStatus)} to {statusLabel(entry.toStatus)}
                        </div>
                        {entry.comment && <div className="mt-2 text-sm leading-6 text-slate-600">{entry.comment}</div>}
                        <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{formatDateTime(entry.createdAt)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[20px] bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 text-sm font-bold text-[#10283f]">{value || "Not available"}</div>
    </div>
  );
}
