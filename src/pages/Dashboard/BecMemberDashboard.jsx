import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AssignmentRoundedIcon from "@mui/icons-material/AssignmentRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PageHero from "../../components/PageHero";
import StatusPill from "../../components/StatusPill";
import { procurementApi } from "../../api/procurementApi";
import { useAuth } from "../../contexts/AuthContext";
import { formatDateTime } from "../../services/apiClient";
import { becPath } from "../../utils/roleRoutes";

const links = [
  { label: "Pending Reviews", detail: "Open quotation items assigned by the BEC Head.", path: "assigned-quotations", icon: AssignmentRoundedIcon },
  { label: "Approved Reviews", detail: "View technical reviews you have completed.", path: "approved-quotations", icon: HistoryRoundedIcon },
  { label: "Audit Trail", detail: "Track BEC workflow activity and submitted records.", path: "audit-trail", icon: HistoryRoundedIcon },
  { label: "Role Requests", detail: "Request access to the BEC Head workspace.", path: "role-requests", icon: ManageAccountsRoundedIcon },
  { label: "Notifications", detail: "Review updates sent to your current BEC role.", path: "notifications", icon: NotificationsRoundedIcon },
];

export default function BecMemberDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "BEC Member";

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    procurementApi.quotations.myAssignedBecQuotations(token)
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Could not load the BEC dashboard."))
      .finally(() => setLoading(false));
  }, [token]);

  const pending = useMemo(() => items.filter((item) => item.assignmentStatus ? item.assignmentStatus === "ASSIGNED" : item.technicalStatus === "PENDING"), [items]);
  const approved = useMemo(() => items.filter((item) => item.assignmentStatus ? item.assignmentStatus === "REVIEWED_APPROVED" : item.technicalStatus === "APPROVED"), [items]);

  return (
    <div className="space-y-6">
      <PageHero eyebrow="BEC Dashboard" title={`Welcome back, ${displayName}`} description="Review assigned vendor quotations and keep track of completed BEC technical evaluations." />

      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {links.map(({ label, detail, path, icon: Icon }) => (
          <button key={path} type="button" onClick={() => navigate(becPath(path))} className="rounded-2xl border border-[#dce8ef] bg-white p-4 text-left shadow-[0_10px_25px_rgba(15,41,64,0.05)] transition hover:-translate-y-0.5 hover:border-[#79b8ce]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]"><Icon fontSize="small" /></span>
            <div className="mt-3 font-black text-[#10283f]">{label}</div>
            <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>
          </button>
        ))}
      </section>

      <section className="rounded-[26px] border border-[#dce8ef] bg-white p-5 shadow-[0_16px_38px_rgba(15,41,64,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Recent activity</div><h2 className="mt-1 text-xl font-black text-[#10283f]">Assigned quotations</h2></div>
          <div className="flex gap-2 text-xs font-bold"><span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700">{pending.length} pending</span><span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">{approved.length} approved</span></div>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-[#dce8ef]">
          {loading && <div className="p-4 text-sm text-slate-600">Loading recent assignments...</div>}
          {!loading && !items.length && <div className="p-4 text-sm text-slate-600">No assigned quotations are available.</div>}
          {items.slice(0, 6).map((item) => (
            <button key={item.quotationItemId} type="button" onClick={() => navigate(becPath(item.technicalStatus === "APPROVED" ? "approved-quotations" : "assigned-quotations"))} className="grid w-full gap-2 border-b border-[#e5eef3] px-4 py-3 text-left text-sm last:border-b-0 hover:bg-[#f5fbfe] md:grid-cols-[1.2fr_1fr_0.8fr_0.8fr] md:items-center">
              <span className="font-black text-[#10283f]">{item.requisitionItemName || "Quotation item"}</span><span className="truncate text-slate-600">{item.vendorName || "Vendor"}</span><span className="text-slate-500">{formatDateTime(item.updatedAt || item.submittedAt)}</span><span className="md:text-right"><StatusPill status={item.technicalStatus || item.assignmentStatus} /></span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
