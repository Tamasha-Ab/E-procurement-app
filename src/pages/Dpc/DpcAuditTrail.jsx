import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { dpcApi } from "../../api/dpcApi";
import { formatDateTime } from "../../services/apiClient";

export default function DpcAuditTrail() {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError("");
      dpcApi.audit.list(token, { search, from, to, page, size: 10 })
        .then((data) => {
          setRecords(Array.isArray(data?.content) ? data.content : []);
          setTotalPages(Math.max(Number(data?.totalPages || 1), 1));
          setTotalElements(Number(data?.totalElements || 0));
        })
        .catch((err) => {
          const message = err.message || "Could not load DPC audit trail.";
          setError(message);
          toast.error(message, { toastId: "dpc-audit-load-error" });
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [token, search, from, to, page]);

  return <div className="space-y-8">
    <PageHero eyebrow="Audit Trail" title="DPC Activity Records" description="Vendor registration decisions and DPC quotation authority decisions in one audit trail." />
    {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
    <section className="rounded-[28px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
      <div className="grid gap-3 rounded-2xl bg-[#f6fafc] p-3 md:grid-cols-[1fr_auto_auto]">
        <input type="search" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search action, vendor, reference or status" className="rounded-xl border border-[#dce8ef] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#166e8c]" />
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">From <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className="rounded-xl border border-[#dce8ef] bg-white px-3 py-2" /></label>
        <label className="flex items-center gap-2 text-xs font-bold text-slate-600">To <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className="rounded-xl border border-[#dce8ef] bg-white px-3 py-2" /></label>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#dce8ef]">
        <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(150px,0.9fr)] gap-4 bg-[#edf7fb] px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#166e8c]"><span>Action</span><span>Subject</span><span>Reference</span><span>Status</span><span className="text-right">Date / Time</span></div>
        {loading && <div className="p-5 text-sm text-slate-500">Loading audit records...</div>}
        {!loading && records.map((record) => <div key={record.id} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(150px,0.9fr)] items-center gap-4 border-t border-[#e8f0f5] px-4 py-3 text-sm hover:bg-[#f7fbfd]"><div className="min-w-0"><div className="truncate font-black text-[#10283f]" title={record.action}>{record.action}</div><div className="mt-1 truncate text-xs text-slate-500" title={record.detail || record.type}>{record.detail || record.type}</div></div><span className="min-w-0 truncate text-slate-700" title={record.subject || "Not recorded"}>{record.subject || "Not recorded"}</span><span className="min-w-0 truncate text-slate-600" title={record.reference || "—"}>{record.reference || "—"}</span><span className="min-w-0 overflow-hidden"><StatusPill status={record.status} /></span><span className="whitespace-nowrap text-right text-xs text-slate-500">{formatDateTime(record.createdAt)}</span></div>)}
        {!loading && !records.length && <div className="p-6 text-center text-sm text-slate-500">No DPC audit records found.</div>}
      </div>
      <div className="mt-4 flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">Page {page + 1} of {totalPages} · {totalElements} records</span><div className="flex gap-2"><button disabled={page === 0} onClick={() => setPage((p) => Math.max(p - 1, 0))} className="rounded-xl bg-[#edf7fb] px-4 py-2 text-sm font-black text-[#166e8c] disabled:opacity-40">Previous</button><button disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-xl bg-[#166e8c] px-4 py-2 text-sm font-black text-white disabled:opacity-40">Next</button></div></div>
    </section>
  </div>;
}
