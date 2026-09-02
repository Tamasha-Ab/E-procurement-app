import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PageHero from "../../components/PageHero";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { buildTenderViewModel, downloadTenderForm, tenderRows } from "../../utils/tenderDocument";
import { formatDateTime, statusLabel } from "../../services/apiClient";
import PaginationControls, { usePagination } from "../../components/PaginationControls";

const statusTone = {
  DRAFT: "bg-slate-100 text-slate-700",
  READY_FOR_RFQ: "bg-emerald-50 text-emerald-700",
  RFQ_CREATED: "bg-blue-50 text-blue-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const isTenderClosed = (tender) =>
  Boolean(tender.closingDateTime) && new Date(tender.closingDateTime).getTime() < Date.now();

const visibleTendersForUser = (tenders, user) =>
  user?.mainRole === "FACULTY_STAFF"
    ? tenders.filter((tender) => !isTenderClosed(tender))
    : tenders;

export default function TenderDirectory() {
  const { token, user } = useAuth();
  const { tenderId } = useParams();
  const [tenders, setTenders] = useState([]);
  const [selectedId, setSelectedId] = useState(tenderId || "");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const detailsRef = useRef(null);

  const loadTenders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.tenders.list(token);
      const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
      const newestFirst = [...list].sort((left, right) => {
        const rightTime = new Date(right.createdAt || right.dateOfPublication || 0).getTime() || 0;
        const leftTime = new Date(left.createdAt || left.dateOfPublication || 0).getTime() || 0;
        if (rightTime !== leftTime) return rightTime - leftTime;
        return Number(right.tenderId || 0) - Number(left.tenderId || 0);
      });
      const visibleList = visibleTendersForUser(newestFirst, user);
      setTenders(newestFirst);
      setSelectedId((current) => {
        if (tenderId && visibleList.some((tender) => String(tender.tenderId) === String(tenderId))) return tenderId;
        if (visibleList.some((tender) => String(tender.tenderId) === String(current))) return current;
        return String(visibleList[0]?.tenderId || "");
      });
    } catch (err) {
      setError(err.message || "Could not load tenders.");
    } finally {
      setLoading(false);
    }
  }, [token, tenderId, user]);

  useEffect(() => {
    if (token) loadTenders();
  }, [token, loadTenders]);

  useEffect(() => {
    if (tenderId) setSelectedId(tenderId);
  }, [tenderId]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    return visibleTendersForUser(tenders, user).filter((tender) => {
      const matchesSearch = !term || [tender.tenderNumber, tender.title, tender.tenderType, tender.procurementMethod, tender.fundingSource]
        .some((value) => String(value || "").toLowerCase().includes(term));
      const tenderTime = new Date(tender.createdAt || tender.dateOfPublication || 0).getTime();
      const matchesFrom = fromTime === null || (Number.isFinite(tenderTime) && tenderTime >= fromTime);
      const matchesTo = toTime === null || (Number.isFinite(tenderTime) && tenderTime <= toTime);
      return matchesSearch && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, search, tenders, user]);

  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(filtered, 10);

  useEffect(() => { setPage(0); }, [dateFrom, dateTo, search, setPage]);

  const selected = filtered.find((tender) => String(tender.tenderId) === String(selectedId)) || filtered[0] || null;
  const view = selected ? buildTenderViewModel(selected) : null;

  const selectTender = (id) => {
    setSelectedId(String(id));
    window.requestAnimationFrame(() => {
      detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Tender Records"
        title="Tenders"
        description="View tender creation details shared through the procurement workflow and download the filled tender form as a PDF."
      >
        <div className="rounded-xl bg-white/10 px-4 py-2.5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Total</div>
          <div className="mt-0.5 text-xl font-black">{filtered.length}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="space-y-6">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_190px_190px]">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tender number, title, type or method"
              className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 text-sm outline-none focus:border-[#166e8c]"
            />
            <label className="flex items-center gap-2 rounded-2xl border border-[#dce8ef] bg-white px-3">
              <span className="whitespace-nowrap text-xs font-bold text-[#166e8c]">From</span>
              <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className="min-w-0 flex-1 py-3 text-sm outline-none" />
            </label>
            <label className="flex items-center gap-2 rounded-2xl border border-[#dce8ef] bg-white px-3">
              <span className="whitespace-nowrap text-xs font-bold text-[#166e8c]">To</span>
              <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className="min-w-0 flex-1 py-3 text-sm outline-none" />
            </label>
          </div>
          <div className="mt-4 overflow-x-auto">
            <div className="grid min-w-[930px] grid-cols-[190px_minmax(230px,1fr)_150px_165px_150px_85px] gap-2 rounded-xl bg-[#f5fbff] px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#166e8c]">
              <span>Tender</span><span>Title</span><span>Type</span><span>Status</span><span>Date / Time</span><span>Action</span>
            </div>
            <div className="mt-2 space-y-2">
            {loading && <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">Loading tenders...</div>}
            {!loading && filtered.length === 0 && <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">No tenders found.</div>}
            {pageItems.map((tender) => (
              <button
                key={tender.tenderId}
                type="button"
                onClick={() => selectTender(tender.tenderId)}
                className={`grid min-w-[930px] w-full grid-cols-[190px_minmax(230px,1fr)_150px_165px_150px_85px] items-center gap-2 rounded-xl border px-3 py-2.5 text-left transition ${String(selected?.tenderId) === String(tender.tenderId) ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#edf3f7] bg-white hover:bg-slate-50"}`}
              >
                  <span className="truncate text-sm font-black text-[#10283f]">{tender.tenderNumber}</span>
                  <span className="truncate text-xs font-semibold text-slate-700">{tender.title}</span>
                  <span className="truncate text-xs text-slate-500">{tender.tenderType || "Not set"}</span>
                  <span className={`w-fit rounded-full px-2.5 py-1 text-[10px] font-black ${statusTone[tender.status] || statusTone.DRAFT}`}>
                    {statusLabel(tender.status)}
                  </span>
                  <span className="whitespace-nowrap text-[10px] font-semibold text-slate-500">{formatDateTime(tender.createdAt)}</span>
                  <span className="text-xs font-bold text-[#166e8c]">Details</span>
              </button>
            ))}
            </div>
          </div>
          <PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={filtered.length} pageSize={pageSize} />
        </div>

        <div ref={detailsRef} className="scroll-mt-24 rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          {!selected || !view ? (
            <div className="rounded-[22px] bg-slate-50 p-5 text-sm text-slate-600">Select a tender to view details.</div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Tender Details</div>
                  <h2 className="mt-2 text-2xl font-black text-[#10283f]">{selected.title}</h2>
                  <div className="mt-1 text-sm font-semibold text-slate-600">{selected.tenderNumber}</div>
                </div>
                <button
                  type="button"
                  onClick={() => downloadTenderForm(selected)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#166e8c] px-4 py-2 text-sm font-bold text-white hover:bg-[#145f79]"
                >
                  <DownloadRoundedIcon fontSize="small" />
                  Download PDF
                </button>
              </div>

              <div className="overflow-hidden rounded-[18px] border border-[#dce8ef]">
                {tenderRows.map(([label, key]) => (
                  <div key={key} className="grid border-b border-[#dce8ef] last:border-b-0 md:grid-cols-[0.38fr_0.62fr]">
                    <div className="bg-[#f8fbfd] px-4 py-3 text-sm font-black text-[#10283f]">{label}</div>
                    <div className="px-4 py-3 text-sm font-semibold text-slate-700">{view[key] || "Not filled"}</div>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <Detail label="Status" value={statusLabel(selected.status)} />
                <Detail label="Created At" value={formatDateTime(selected.createdAt)} />
                <Detail label="Created By" value={selected.createdByName || "Not recorded"} />
                <Detail label="Updated At" value={formatDateTime(selected.updatedAt)} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-[18px] bg-slate-50 p-4">
      <div className="text-xs font-bold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 text-sm font-semibold text-[#10283f]">{value || "Not recorded"}</div>
    </div>
  );
}
