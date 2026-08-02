import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import PageHero from "../../components/PageHero";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { buildTenderViewModel, downloadTenderForm, tenderRows } from "../../utils/tenderDocument";
import { formatDateTime, statusLabel } from "../../services/apiClient";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTenders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await procurementApi.tenders.list(token);
      const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
      const visibleList = visibleTendersForUser(list, user);
      setTenders(list);
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
    const visibleTenders = visibleTendersForUser(tenders, user);
    if (!term) return visibleTenders;
    return visibleTenders.filter((tender) =>
      [tender.tenderNumber, tender.title, tender.tenderType, tender.procurementMethod, tender.fundingSource]
        .some((value) => String(value || "").toLowerCase().includes(term))
    );
  }, [search, tenders, user]);

  const selected = filtered.find((tender) => String(tender.tenderId) === String(selectedId)) || filtered[0] || null;
  const view = selected ? buildTenderViewModel(selected) : null;

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Tender Records"
        title="Tenders"
        description="View tender creation details shared through the procurement workflow and download the filled tender form as a PDF."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Total</div>
          <div className="mt-2 text-3xl font-black">{filtered.length}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search tenders"
            className="w-full rounded-2xl border border-[#dce8ef] px-4 py-3 text-sm outline-none focus:border-[#166e8c]"
          />
          <div className="mt-5 space-y-3">
            {loading && <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">Loading tenders...</div>}
            {!loading && filtered.length === 0 && <div className="rounded-[20px] bg-slate-50 p-4 text-sm text-slate-600">No tenders found.</div>}
            {filtered.map((tender) => (
              <button
                key={tender.tenderId}
                type="button"
                onClick={() => setSelectedId(String(tender.tenderId))}
                className={`w-full rounded-[22px] border p-4 text-left transition ${String(selected?.tenderId) === String(tender.tenderId) ? "border-[#166e8c] bg-[#f5fbff]" : "border-[#edf3f7] bg-white hover:bg-slate-50"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-[#10283f]">{tender.tenderNumber}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-700">{tender.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{tender.tenderType || "Tender type not set"}</div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone[tender.status] || statusTone.DRAFT}`}>
                    {statusLabel(tender.status)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
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
