import { useEffect, useMemo, useState } from "react";
import { Button } from "@mui/material";
import AddTaskRoundedIcon from "@mui/icons-material/AddTaskRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { useNavigate, useSearchParams } from "react-router-dom";
import { vendorApi } from "../../api/vendorApi";
import PageHero from "../../components/PageHero";
import { rfqDisplayName, rfqContext } from "../../utils/procurementDisplay";

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
      setRfqs(safeList(rfqList));
      setQuotations(safeList(quotationList));
    } catch (loadError) {
      setError(loadError.message || "Could not load RFQ invitations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const submittedRfqIds = useMemo(() => new Set(quotations.map((quotation) => quotation.rfqId)), [quotations]);
  const vendorStatus = profile?.vendorStatus || "";
  const canSubmitVendorWork = vendorStatus === "APPROVED";

  const openQuotation = (rfq) => {
    if (!canSubmitVendorWork) {
      setError("Your vendor account must be approved before submitting quotations.");
      return;
    }
    navigate(`/vendor/quotation-submission?rfqId=${rfq.rfqId}`);
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

        <div className="mt-6 space-y-4">
          {loading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading RFQ invitations...</div>}
          {!loading && !rfqs.length && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No RFQ invitations are available right now.</div>}
          {rfqs.map((rfq) => (
            <article
              key={rfq.rfqId}
              className={`rounded-[24px] border p-5 ${
                String(rfq.rfqId) === String(focusRfqId)
                  ? "border-[#166e8c] bg-[#f5fbff]"
                  : "border-[#e6eef3] bg-slate-50"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">
                    {rfqContext(rfq) || "Vendor invitation"}
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-[#10283f]">{rfqDisplayName(rfq)}</h3>
                  <p className="mt-2 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-600">
                    {rfq.description || "No RR details provided."}
                  </p>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                    <span>Submission: {formatDate(rfq.submissionDeadline)}</span>
                    <span>Bid opening: {formatDate(rfq.bidOpeningDateTime)}</span>
                    <span>Objection: {formatDate(rfq.objectionDeadline)}</span>
                  </div>
                </div>
                <span className={`self-start rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${statusClass(rfq.status)}`}>
                  {rfq.status || "Open"}
                </span>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PictureAsPdfRoundedIcon />}
                  onClick={() => navigate(`/vendor/rfqs/${rfq.rfqId}/document`)}
                  sx={{ textTransform: "none", borderColor: "#166e8c", color: "#166e8c" }}
                >
                  View RFQ PDF
                </Button>
                {canSubmitVendorWork && !submittedRfqIds.has(rfq.rfqId) && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<AddTaskRoundedIcon />}
                    onClick={() => openQuotation(rfq)}
                    sx={{ textTransform: "none", bgcolor: "#166e8c" }}
                  >
                    Quotation
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

    </div>
  );
}
