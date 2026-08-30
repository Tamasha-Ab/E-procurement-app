import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import StatusPill from "../../components/StatusPill";
import { emptyStaffStats } from "./dashboardConfig";
import { staffMemberPath } from "../../utils/roleRoutes";

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
      <section>
        <div className="overflow-hidden rounded-2xl border border-[#2c7895] bg-[linear-gradient(110deg,#123047_0%,#175a75_52%,#6fb8cf_100%)] px-6 py-5 text-white shadow-[0_12px_30px_rgba(15,41,64,0.18)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-100">Staff Dashboard</div>
          <h1 className="mt-2 text-2xl font-bold leading-tight tracking-[-0.02em]">Welcome back, {displayName}.</h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-100/90">
            You are signed in as {statusLabel(displayRole)}. Your workspace shows requisition actions connected to your role.
          </p>

          {error && <div className="mt-5 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white">{error}</div>}

          <button
            type="button"
            onClick={() => navigate(staffMemberPath("create-requisition"))}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f6c453] px-4 py-2.5 text-sm font-extrabold text-[#0f2940] shadow-sm transition hover:bg-[#efb93c]"
          >
            <AddCircleRoundedIcon fontSize="small" />
            Create Requisition
          </button>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 px-3.5 py-3 backdrop-blur">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/15"><Icon fontSize="small" /></div>
                  <div>
                    <div className="text-xl font-black leading-none">{loading ? "..." : metric.value}</div>
                    <div className="mt-1 text-xs text-slate-200">{metric.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </section>

      <section>
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Recent Requests</div>
              <h3 className="mt-2 text-2xl font-bold text-[#10283f]">Your latest requisitions</h3>
            </div>
            <button type="button" onClick={() => navigate(staffMemberPath("my-requisitions"))} className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">
              View All
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {recentRequests.length > 0 ? (
              recentRequests.slice(0, 4).map((request) => (
                <button
                  type="button"
                  key={request.rrId}
                  onClick={() => navigate(`${staffMemberPath("my-requisitions")}/${request.rrId}`)}
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
      </section>
    </div>
  );
}
