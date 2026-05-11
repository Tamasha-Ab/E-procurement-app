import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import StatusPill from "../../components/StatusPill";
import { emptyStaffStats, workflowHighlights } from "./dashboardConfig";

export default function StaffDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [staffStats, setStaffStats] = useState(emptyStaffStats);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Astraea User";
  const displayRole = user?.subRole || user?.mainRole || "USER";
  const recentRequests = staffStats.recentRequests || [];

  useEffect(() => {
    if (!token) return;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest("/api/staff/dashboard", { token });
        setStaffStats({ ...emptyStaffStats, ...data });
      } catch (err) {
        setError(err.message || "Dashboard data could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [token]);

  const metrics = useMemo(() => [
    { label: "Total Requests", value: staffStats.totalRequests, icon: Inventory2RoundedIcon },
    { label: "Draft Requests", value: staffStats.draftRequests, icon: AccessTimeRoundedIcon },
    { label: "In Progress", value: staffStats.inProgressRequests, icon: AccountTreeRoundedIcon },
    { label: "Approved", value: staffStats.approvedRequests, icon: TaskAltRoundedIcon },
  ], [staffStats]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-8 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">Staff Dashboard</div>
          <h1 className="mt-4 text-4xl font-black leading-tight">Welcome back, {displayName}.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-100/90">
            You are signed in as {statusLabel(displayRole)}. Your workspace shows requisition actions connected to your role.
          </p>

          {error && <div className="mt-5 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white">{error}</div>}

          <button
            type="button"
            onClick={() => navigate("/requisition/create")}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#f6c453] px-5 py-3 text-sm font-extrabold text-[#0f2940] shadow-[0_14px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#efb93c]"
          >
            <AddCircleRoundedIcon fontSize="small" />
            Create Requisition
          </button>

          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Icon /></div>
                  <div className="mt-5 text-3xl font-black">{loading ? "..." : metric.value}</div>
                  <div className="mt-1 text-sm text-slate-200">{metric.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-8 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Next Action</div>
          <h2 className="mt-3 text-2xl font-bold text-[#10283f]">Start or track a requisition</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Create a new RR, save it as a draft, submit it to HOD, or check comments on returned requests.
          </p>
          <div className="mt-7 space-y-4">
            {workflowHighlights.map((item, index) => (
              <div key={item} className="flex gap-4 rounded-[24px] bg-slate-50 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0f2940] text-sm font-bold text-white">{index + 1}</div>
                <div className="text-sm leading-7 text-slate-600">{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)] lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Recent Requests</div>
              <h3 className="mt-2 text-2xl font-bold text-[#10283f]">Your latest requisitions</h3>
            </div>
            <button type="button" onClick={() => navigate("/requisitions")} className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">
              View All
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {recentRequests.length > 0 ? (
              recentRequests.slice(0, 4).map((request) => (
                <button
                  type="button"
                  key={request.rrId}
                  onClick={() => navigate(`/requisitions/${request.rrId}`)}
                  className="w-full rounded-[22px] border border-[#e4edf2] bg-[#f8fbfd] p-4 text-left transition hover:border-[#166e8c]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-[#10283f]">{request.title || `RR-${request.rrId}`}</div>
                      <div className="mt-1 text-sm text-slate-500">{formatDateTime(request.createdAt || request.submittedAt)}</div>
                    </div>
                    <StatusPill status={request.status} />
                  </div>
                  <div className="mt-3 text-sm font-semibold text-[#166e8c]">{formatMoney(request.estimatedTotalAmount || request.totalAmount)}</div>
                </button>
              ))
            ) : (
              <div className="rounded-[24px] bg-[#f5fbff] p-5">
                <div className="text-sm font-semibold text-[#166e8c]">No recent requisitions yet</div>
                <div className="mt-3 text-4xl font-black text-[#10283f]">{staffStats.totalRequests}</div>
                <div className="mt-2 text-sm leading-7 text-slate-600">Create your first requisition request to begin the Staff workflow.</div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Snapshot</div>
          <div className="mt-4 space-y-4">
            <div className="rounded-[22px] bg-slate-50 p-4">
              <div className="text-sm font-semibold text-[#10283f]">Audit Trail</div>
              <div className="mt-1 text-sm text-slate-600">Every approval action stays timestamped and reviewable.</div>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <div className="text-sm font-semibold text-[#10283f]">Budget Discipline</div>
              <div className="mt-1 text-sm text-slate-600">Requests exceeding department budget can be blocked automatically.</div>
            </div>
            <div className="rounded-[22px] bg-slate-50 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1c7] text-[#b47a00]"><ErrorOutlineRoundedIcon /></div>
              <div className="mt-4 text-sm font-semibold text-[#10283f]">Supplier Readiness</div>
              <div className="mt-1 text-sm text-slate-600">Approved requests can continue into RFQ, bids, offer letters, and PO creation.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
