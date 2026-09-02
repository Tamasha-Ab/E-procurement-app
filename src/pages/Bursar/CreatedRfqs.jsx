import { useEffect, useMemo, useRef, useState } from "react";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { useAuth } from "../../contexts/AuthContext";
import { procurementApi } from "../../api/procurementApi";
import { formatDateTime } from "../../services/apiClient";
import { rfqDisplayName } from "../../utils/procurementDisplay";
import PaginationControls from "../../components/PaginationControls";

const PAGE_SIZE = 10;
const categoryOf = (rfq) => rfq.vendorCategory || "Uncategorized";

export default function CreatedRfqs() {
  const { token } = useAuth();
  const detailsRef = useRef(null);
  const [rfqs, setRfqs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.rfqs.listPage(token, page, PAGE_SIZE);
      setRfqs(data?.content || []);
      setTotalPages(Math.max(1, data?.totalPages || 1));
      setTotalItems(data?.totalElements || 0);
    } catch (err) {
      setError(err.message || "Could not load created RFQs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) load(); }, [token, page]);

  const groups = useMemo(() => rfqs.reduce((result, rfq) => {
    const category = categoryOf(rfq);
    if (!result[category]) result[category] = [];
    result[category].push(rfq);
    return result;
  }, {}), [rfqs]);

  const selectRfq = (rfq) => {
    setSelected(rfq);
    window.requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="space-y-8">
      <PageHero eyebrow="Finance Department" title="Created RFQs" description="Review RFQs already created and sent to vendors. These records are read-only.">
        <div className="rounded-xl bg-white/10 px-4 py-2.5 text-right backdrop-blur"><div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Created</div><div className="mt-0.5 text-xl font-black">{totalItems}</div></div>
      </PageHero>
      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="space-y-4 rounded-[30px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="flex items-center justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RFQ Records</div><h2 className="mt-1 text-xl font-black text-[#10283f]">Category-wise Created RFQs</h2></div><button type="button" onClick={load} className="rounded-xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c]">Refresh</button></div>
        {loading && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Loading created RFQs...</div>}
        {!loading && rfqs.length === 0 && <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No RFQs have been created yet.</div>}

        {Object.entries(groups).map(([category, items]) => (
          <div key={category} className="overflow-hidden rounded-2xl border border-[#dce8ef]">
            <div className="flex items-center justify-between bg-[#f5fbff] px-4 py-2.5"><div className="text-sm font-black text-[#10283f]">{category}</div><span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-[#166e8c]">{items.length} RFQ{items.length === 1 ? "" : "s"}</span></div>
            <div className="overflow-x-auto p-3">
              <div className="grid min-w-[980px] grid-cols-[220px_190px_150px_165px_165px_90px] gap-2 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-[#166e8c]"><span>RFQ</span><span>Linked RR</span><span>Status</span><span>Deadline</span><span>Created At</span><span>Action</span></div>
              <div className="space-y-2">
                {items.map((rfq) => (
                  <button key={rfq.rfqId} type="button" onClick={() => selectRfq(rfq)} className={`grid min-w-[980px] w-full grid-cols-[220px_190px_150px_165px_165px_90px] items-center gap-2 rounded-xl border px-3 py-2.5 text-left ${selected?.rfqId === rfq.rfqId ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#e1ebf0] hover:bg-[#f8fcff]"}`}>
                    <span className="min-w-0"><span className="block truncate text-sm font-black text-[#10283f]">{rfqDisplayName(rfq)}</span><span className="block truncate text-[10px] text-[#166e8c]">{rfq.title}</span></span>
                    <span className="truncate text-xs text-slate-600">{rfq.rrNumber || (rfq.rrId ? `RR-${rfq.rrId}` : "No RR linked")}</span>
                    <span><StatusPill status={rfq.status} /></span>
                    <span className="whitespace-nowrap text-[10px] text-slate-500">{formatDateTime(rfq.submissionDeadline)}</span>
                    <span className="whitespace-nowrap text-[10px] text-slate-500">{formatDateTime(rfq.createdAt)}</span>
                    <span className="text-xs font-bold text-[#166e8c]">Details</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
        <PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={totalItems} pageSize={PAGE_SIZE} />
      </section>

      {selected && (
        <section ref={detailsRef} className="scroll-mt-24 rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]"><DescriptionRoundedIcon /></span><div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">RFQ Details</div><h2 className="mt-1 text-2xl font-black text-[#10283f]">{rfqDisplayName(selected)}</h2></div></div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Detail label="Category" value={categoryOf(selected)} /><Detail label="Linked RR" value={selected.rrNumber || (selected.rrId ? `RR-${selected.rrId}` : "No RR linked")} /><Detail label="Created By" value={selected.createdByName} /><Detail label="Status" value={selected.status} /><Detail label="Bid Start" value={formatDateTime(selected.bidStartDateTime)} /><Detail label="Submission Deadline" value={formatDateTime(selected.submissionDeadline)} /><Detail label="Bid Opening" value={formatDateTime(selected.bidOpeningDateTime)} /><Detail label="Created At" value={formatDateTime(selected.createdAt)} /></div>
          {selected.description && <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 whitespace-pre-line">{selected.description}</div>}
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#166e8c]">{label}</div><div className="mt-1.5 text-sm font-bold text-[#10283f]">{value || "Not set"}</div></div>;
}
