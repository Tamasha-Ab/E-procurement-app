import { useEffect, useMemo, useState } from "react";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../contexts/AuthContext";
import { dpcApi } from "../../api/dpcApi";
import { formatDateTime, statusLabel } from "../../services/apiClient";

const actionText = {
  APPROVED: "Vendor approved",
  PENDING: "Vendor pending review",
  BLACK_LISTED: "Vendor black listed",
  REJECTED: "Vendor rejected",
};

export default function DpcAuditTrail() {
  const { token } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    dpcApi.vendors.list(token)
      .then((list) => setVendors(Array.isArray(list) ? list : []))
      .catch((err) => setError(err.message || "Could not load DPC audit trail."))
      .finally(() => setLoading(false));
  }, [token]);

  const events = useMemo(() => vendors.map((vendor) => ({
    key: vendor.userId,
    action: actionText[vendor.vendorStatus] || "Vendor reviewed",
    vendor: vendor.vendorName || vendor.username,
    email: vendor.email || vendor.vendorEmail,
    status: vendor.vendorStatus || "PENDING",
    detail: vendor.rejectionReason || vendor.vendorCategory || "Registration details reviewed by DPC.",
    at: vendor.updatedAt || vendor.approvedAt || vendor.createdAt,
  })).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)), [vendors]);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Audit Trail"
        title="DPC Vendor Decisions"
        description="Track vendor registration status and DPC review outcomes."
      />

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Vendor Activity</div>
        <div className="mt-5 space-y-3">
          {loading && <div className="rounded-[22px] bg-slate-50 p-4 text-sm text-slate-600">Loading audit trail...</div>}
          {!loading && events.length === 0 && <div className="rounded-[22px] bg-slate-50 p-4 text-sm text-slate-600">No DPC audit entries found.</div>}
          {events.map((event) => (
            <div key={event.key} className="rounded-[22px] border border-[#edf3f7] bg-white p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]">
                    <HistoryRoundedIcon fontSize="small" />
                  </span>
                  <div>
                    <div className="font-black text-[#10283f]">{event.action}</div>
                    <div className="mt-1 text-sm text-slate-600">{event.vendor} - {event.email}</div>
                    <div className="mt-2 text-sm text-slate-500">{event.detail}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-[0.16em] text-[#166e8c]">{statusLabel(event.status)}</div>
                  <div className="mt-2 text-xs text-slate-500">{formatDateTime(event.at)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
