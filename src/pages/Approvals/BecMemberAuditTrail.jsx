import { useEffect, useState } from "react";
import PageHero from "../../components/PageHero";
import PaginationControls from "../../components/PaginationControls";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime, formatMoney } from "../../services/apiClient";

export default function BecMemberAuditTrail() {
  const { token } = useAuth();
  const [records, setRecords] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pageSize = 10;

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    procurementApi.quotations.myBecReviewAuditTrail(token, page, pageSize)
      .then((result) => {
        setRecords(result?.content || []);
        setTotalPages(Math.max(1, Number(result?.totalPages || 1)));
        setTotalItems(Number(result?.totalElements || 0));
      })
      .catch((err) => setError(err.message || "Could not load your BEC audit trail."))
      .finally(() => setLoading(false));
  }, [page, token]);

  return (
    <div className="space-y-8">
      <PageHero eyebrow="BEC Member Audit Trail" title="Quotation Review Activity" description="Review the approved and rejected quotation evaluations completed using your current BEC role." />
      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      <section className="rounded-[26px] border border-[#dce8ef] bg-white p-5 shadow-[0_16px_38px_rgba(15,41,64,0.06)]">
        <div className="mb-4 flex items-center justify-between gap-3"><div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Review records</div><div className="rounded-full bg-[#edf7fb] px-3 py-1 text-xs font-bold text-[#166e8c]">{totalItems} records</div></div>
        <div className="overflow-x-auto rounded-2xl border border-[#dce8ef]">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-[#edf7fb] text-left text-[11px] font-black uppercase tracking-[0.14em] text-[#166e8c]"><tr><th className="px-4 py-3">Item</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">RFQ</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Decision</th><th className="px-4 py-3">Date / Time</th><th className="px-4 py-3">Comment</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8" className="px-4 py-5 text-slate-600">Loading BEC audit records...</td></tr>}
              {!loading && !records.length && <tr><td colSpan="8" className="px-4 py-5 text-slate-600">No completed BEC review records found.</td></tr>}
              {!loading && records.map((record) => <tr key={record.quotationItemId} className="border-t border-[#e5eef3] bg-white hover:bg-[#f8fcff]"><td className="px-4 py-3 font-black text-[#10283f]">{record.requisitionItemName || "Quotation item"}</td><td className="px-4 py-3 text-slate-600">{record.vendorName || "Vendor"}</td><td className="px-4 py-3 text-slate-600">{record.rfqNumber || `RFQ ${record.rfqId}`}</td><td className="px-4 py-3 text-slate-600">{record.category || "Not recorded"}</td><td className="whitespace-nowrap px-4 py-3 font-bold text-[#10283f]">{formatMoney(record.quotedTotalPrice)}</td><td className="px-4 py-3"><StatusPill status={record.technicalStatus || record.assignmentStatus} /></td><td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(record.updatedAt || record.submittedAt)}</td><td className="max-w-[260px] truncate px-4 py-3 text-slate-600" title={record.tecComment || ""}>{record.tecComment || "No comment"}</td></tr>)}
            </tbody>
          </table>
        </div>
        <PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} alwaysShow />
      </section>
    </div>
  );
}
