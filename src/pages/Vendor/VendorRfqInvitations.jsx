import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@mui/material";
import AddTaskRoundedIcon from "@mui/icons-material/AddTaskRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useNavigate, useSearchParams } from "react-router-dom";
import { vendorApi } from "../../api/vendorApi";
import PageHero from "../../components/PageHero";
import { rfqDisplayName, rfqContext } from "../../utils/procurementDisplay";
import PaginationControls, { usePagination } from "../../components/PaginationControls";

const cardClass = "rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]";

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const statusClass = (status = "") => {
  const normalized = status.toUpperCase();
  if (normalized.includes("APPROV") || normalized.includes("ACCEPT") || normalized.includes("AWARD")) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (normalized.includes("REJECT") || normalized.includes("DECLIN")) {
    return "bg-red-50 text-red-700";
  }
  if (normalized.includes("PENDING") || normalized.includes("SUBMIT")) {
    return "bg-[#fff9ec] text-[#b47a00]";
  }
  return "bg-[#edf7fb] text-[#166e8c]";
};

const safeList = (value) => (Array.isArray(value) ? value : []);

export default function VendorRfqInvitations() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const focusRfqId = searchParams.get("rfqId") || "";
  const [rfqs, setRfqs] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState(null);
  const detailsRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [profileData, rfqList, quotationList] = await Promise.all([
        vendorApi.profile.get().catch(() => null),
        vendorApi.rfqs.list().catch(() => []),
        vendorApi.quotations.list().catch(() => []),
      ]);
      setProfile(profileData);
      const invitationList = safeList(rfqList);
      const vendorQuotations = safeList(quotationList);
      const submittedIds = new Set(vendorQuotations.map((quotation) => String(quotation.rfqId)));
      const openInvitations = invitationList.filter(
        (rfq) => !submittedIds.has(String(rfq.rfqId)) && rfq.status !== "OFFER_LETTER_APPROVED"
      );
      setRfqs(openInvitations);
      if (focusRfqId) setSelected(openInvitations.find((rfq) => String(rfq.rfqId) === String(focusRfqId)) || null);
      setQuotations(vendorQuotations);
    } catch (loadError) {
      setError(loadError.message || "Could not load RFQ invitations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submittedRfqIds = useMemo(() => new Set(quotations.map((quotation) => String(quotation.rfqId))), [quotations]);
  const vendorStatus = profile?.vendorStatus || "";
  const canSubmitVendorWork = vendorStatus === "APPROVED";
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(rfqs, 10);

  const openQuotation = (rfq) => {
    if (!canSubmitVendorWork) {
      setError("Your vendor account must be approved before submitting quotations.");
      return;
    }
    navigate(`/vendor/quotation-submission?rfqId=${rfq.rfqId}`);
  };

  const selectRfq = (rfq) => {
    setSelected(rfq);
    window.requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="space-y-7">
      <PageHero
        eyebrow="RFQ Invitations"
        title="RFQ Invitations"
        description="Review every RFQ invitation sent to your vendor account and open the vendor PDF before submitting quotations."
      >
        <Button
          variant="contained"
          startIcon={<RefreshRoundedIcon />}
          onClick={load}
          sx={{ bgcolor: "#f6c453", color: "#10283f", textTransform: "none", fontWeight: 800, borderRadius: "14px" }}
        >
          Refresh
        </Button>
      </PageHero>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</div> : null}

      <section className={cardClass}>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Inbox</div>
            <h2 className="mt-2 text-2xl font-black text-[#10283f]">All RFQ invitations</h2>
          </div>
          <span className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-[#166e8c]">
            {rfqs.length} Received
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="grid min-w-[1010px] grid-cols-[220px_180px_40px_150px_140px_30px_250px] gap-2 rounded-xl bg-[#f5fbff] px-3 py-2.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[#166e8c]"><span>RFQ</span><span>Status</span><span aria-hidden="true" /><span>Submission</span><span>Bid Opening</span><span aria-hidden="true" /><span className="text-right">Actions</span></div>
          <div className="mt-2 space-y-2">
          {loading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading RFQ invitations...</div>}
          {!loading && !rfqs.length && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No RFQ invitations are available right now.</div>}
          {pageItems.map((rfq) => (
            <div
              key={rfq.rfqId}
              role="button"
              tabIndex={0}
              onClick={() => selectRfq(rfq)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") selectRfq(rfq); }}
              className={`grid min-w-[1010px] cursor-pointer grid-cols-[220px_180px_40px_150px_140px_30px_250px] items-center gap-2 rounded-xl border px-3 py-2.5 transition ${
                String(rfq.rfqId) === String(selected?.rfqId || focusRfqId)
                  ? "border-[#166e8c] bg-[#f5fbff]"
                  : "border-[#e6eef3] bg-slate-50 hover:bg-[#f8fcff]"
              }`}
            >
                <div className="min-w-0"><h3 className="truncate text-sm font-bold text-[#10283f]">{rfqDisplayName(rfq)}</h3><div className="mt-0.5 truncate text-[10px] font-semibold text-[#166e8c]">{rfqContext(rfq) || "Vendor invitation"}</div></div>
                <span className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${statusClass(rfq.status)}`}>
                  {rfq.status || "Open"}
                </span>
                <span aria-hidden="true" />
                <span className="whitespace-nowrap text-[10px] text-slate-500">{formatDate(rfq.submissionDeadline)}</span>
                <span className="whitespace-nowrap text-[10px] text-slate-500">{formatDate(rfq.bidOpeningDateTime)}</span>
                <span aria-hidden="true" />
              <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PictureAsPdfRoundedIcon />}
                  onClick={() => navigate(`/vendor/rfqs/${rfq.rfqId}/document`)}
                  sx={{ textTransform: "none", borderColor: "#166e8c", color: "#166e8c", whiteSpace: "nowrap", flexShrink: 0 }}
                >
                  View RFQ PDF
                </Button>
                {canSubmitVendorWork && !submittedRfqIds.has(String(rfq.rfqId)) && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddTaskRoundedIcon />}
                    onClick={() => openQuotation(rfq)}
                    sx={{ textTransform: "none", bgcolor: "#166e8c", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    Quotation
                  </Button>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
        <PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={rfqs.length} pageSize={pageSize} />
      </section>

      {selected && (
        <section ref={detailsRef} className="scroll-mt-24 rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div><div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">RFQ Details</div><h2 className="mt-2 text-2xl font-black text-[#10283f]">{rfqDisplayName(selected)}</h2><div className="mt-1 text-sm font-semibold text-slate-500">{rfqContext(selected) || "Vendor invitation"}</div></div>
            <span className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${statusClass(selected.status)}`}>{selected.status || "Open"}</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Detail label="Category" value={selected.vendorCategory} />
            <Detail label="Submission Deadline" value={formatDate(selected.submissionDeadline)} />
            <Detail label="Bid Opening" value={formatDate(selected.bidOpeningDateTime)} />
            <Detail label="Objection Deadline" value={formatDate(selected.objectionDeadline)} />
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 whitespace-pre-line">{selected.description || "No RR details provided."}</div>
        </section>
      )}

    </div>
  );
}

function Detail({ label, value }) {
  return <div className="rounded-xl bg-slate-50 p-4"><div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#166e8c]">{label}</div><div className="mt-1.5 text-sm font-bold text-[#10283f]">{value || "Not set"}</div></div>;
}
