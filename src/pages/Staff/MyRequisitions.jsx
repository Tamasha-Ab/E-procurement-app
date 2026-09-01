import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney } from "../../services/apiClient";
import { requestDisplayName, requestContext } from "../../utils/procurementDisplay";
import { staffMemberPath } from "../../utils/roleRoutes";
import PaginationControls from "../../components/PaginationControls";
import { toast } from "react-toastify";

const PAGE_SIZE = 10;

export default function MyRequisitions() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(0); }, 350);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (fromDate) params.set("fromDate", fromDate);
    if (toDate) params.set("toDate", toDate);
    apiRequest(`/api/staff/requisitions?${params}`, { token })
      .then((data) => {
        if (active) {
          const content = Array.isArray(data) ? data : data?.content || [];
          setRequests(content);
          setTotalItems(Array.isArray(data) ? content.length : data?.totalElements || 0);
          setTotalPages(Math.max(1, Array.isArray(data) ? 1 : data?.totalPages || 1));
          setSelectedIds(new Set());
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Could not load requisitions.");
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, page, debouncedSearch, fromDate, toDate]);

  const idsOnPage = requests.map((request) => request.rrId);
  const selectedDraftIds = requests.filter((request) => request.status === "DRAFT" && selectedIds.has(request.rrId)).map((request) => request.rrId);
  const allPageSelected = idsOnPage.length > 0 && idsOnPage.every((id) => selectedIds.has(id));

  const toggleSelected = (rrId) => setSelectedIds((current) => {
    const next = new Set(current);
    next.has(rrId) ? next.delete(rrId) : next.add(rrId);
    return next;
  });

  const togglePage = () => setSelectedIds(allPageSelected ? new Set() : new Set(idsOnPage));

  const deleteSelected = async () => {
    if (!selectedDraftIds.length) {
      toast.warning("Only draft requisitions can be deleted. No draft is included in the selection.", { autoClose: 4000 });
      return;
    }
    if (!window.confirm(`Delete ${selectedDraftIds.length} selected draft requisition(s)?`)) return;
    setDeleting(true);
    try {
      await apiRequest("/api/staff/requisitions", { token, method: "DELETE", body: JSON.stringify(selectedDraftIds) });
      toast.success(`${selectedDraftIds.length} draft requisition(s) deleted.`, { autoClose: 3000 });
      setSelectedIds(new Set());
      if (requests.length === selectedDraftIds.length && page > 0) setPage((current) => current - 1);
      else {
        const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        const data = await apiRequest(`/api/staff/requisitions?${params}`, { token });
        setRequests(data?.content || []); setTotalItems(data?.totalElements || 0); setTotalPages(Math.max(1, data?.totalPages || 1));
      }
    } catch (deleteError) {
      toast.error(deleteError.message || "Could not delete selected drafts.", { autoClose: 4000 });
    } finally { setDeleting(false); }
  };

  const openRequest = (request) => navigate(
    ["DRAFT", "HOD_REJECTED"].includes(request.status)
      ? `${staffMemberPath("create-requisition")}/${request.rrId}`
      : `${staffMemberPath("my-requisitions")}/${request.rrId}`
  );

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Staff Workspace"
        title="My Requisitions"
        description="Review drafts and submitted requisitions. Drafts can be edited and submitted to the Division Head when ready."
      >
        <div className="min-w-[132px] rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-right backdrop-blur">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">Total Requisitions</div>
          <div className="mt-1 text-2xl font-black leading-none text-white">{isLoading ? "..." : totalItems}</div>
        </div>
      </PageHero>

      <section className="overflow-hidden rounded-[30px] border border-[#dce8ef] bg-white shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="border-b border-[#e6eef3] px-5 py-4 text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Requisition Requests</div>

        <div className="m-5 grid gap-3 rounded-xl border border-[#dce8ef] bg-[#f8fcff] p-3 lg:grid-cols-[minmax(240px,1fr)_150px_150px_auto_auto] lg:items-center">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search RR number, title, item or status" className="rounded-xl border border-[#d3e3eb] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#166e8c]" />
          <input type="date" aria-label="From date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); setPage(0); }} className="rounded-xl border border-[#d3e3eb] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-[#166e8c]" />
          <input type="date" aria-label="To date" value={toDate} onChange={(event) => { setToDate(event.target.value); setPage(0); }} className="rounded-xl border border-[#d3e3eb] bg-white px-3 py-2.5 text-sm text-slate-600 outline-none focus:border-[#166e8c]" />
          <label className="flex items-center gap-2 whitespace-nowrap text-xs font-bold text-[#10283f]"><input type="checkbox" checked={allPageSelected} onChange={togglePage} disabled={!idsOnPage.length} /> Select All</label>
          <button type="button" onClick={deleteSelected} disabled={!selectedIds.size || deleting} className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white disabled:cursor-not-allowed disabled:bg-red-200">{deleting ? "Deleting..." : `Delete drafts (${selectedDraftIds.length})`}</button>
        </div>

        {error && <div className="m-5 rounded-[20px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

        {!error && (
          <div className="p-5 space-y-3 overflow-x-auto">
                <div className="grid min-w-[1080px] grid-cols-[34px_minmax(180px,1fr)_220px_130px_150px_210px_70px] gap-1 rounded-xl bg-[#f5fbff] px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[#166e8c]">
                  <span /><span>RR</span><span>Details</span><span>Amount</span><span>Status</span><span className="pl-8">Date / Time</span><span>Action</span>
                </div>
                {requests.map((request) => (
                  <div key={request.rrId} onClick={() => openRequest(request)} className="grid min-w-[1080px] w-full cursor-pointer grid-cols-[34px_minmax(180px,1fr)_220px_130px_150px_210px_70px] items-center gap-1 rounded-xl border border-[#dce8ef] bg-white px-3 py-2.5 text-left transition hover:bg-[#f8fcff]">
                    <input type="checkbox" aria-label={`Select ${requestDisplayName(request)}`} checked={selectedIds.has(request.rrId)} onClick={(event) => event.stopPropagation()} onChange={() => toggleSelected(request.rrId)} />
                    <span className="truncate text-sm font-bold text-[#10283f]">{requestDisplayName(request)}</span>
                    <span className="text-xs truncate text-slate-500">{requestContext(request) || `Stage: ${request.currentStage}`}</span>
                    <span className="whitespace-nowrap text-xs font-bold text-[#10283f]">{formatMoney(request.estimatedTotalAmount)}</span>
                    <span><StatusPill status={request.status} /></span>
                    <span className="whitespace-nowrap border-l border-[#dce8ef] pl-8 text-[10px] font-semibold text-slate-500">{formatDateTime(request.status === "DRAFT" ? request.updatedAt : request.submittedAt)}</span>
                    <span className="text-xs font-bold text-[#166e8c]">{["DRAFT", "HOD_REJECTED"].includes(request.status) ? "Edit" : "View"}</span>
                  </div>
                ))}
                {!isLoading && !requests.length ? <div className="py-8 text-center text-slate-500">No requisitions found.</div> : null}
                {isLoading ? <div className="py-8 text-center text-slate-500">Loading requisitions...</div> : null}
          </div>
        )}
        <div className="px-5 pb-5"><PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} alwaysShow /></div>
      </section>
    </div>
  );
}
