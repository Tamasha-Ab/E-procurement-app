import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import { approverDashboardConfig } from "./dashboardConfig";
import { becHeadPath, deanPath, divisionHeadPath, isBecHead, isDean, isDivisionHead, isVc, vcPath } from "../../utils/roleRoutes";
import StatusPill from "../../components/StatusPill";
import { requestDisplayName } from "../../utils/procurementDisplay";

export default function ApproverDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentRequests, setRecentRequests] = useState([]);

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Astraea User";
  const displayRole = user?.subRole || user?.mainRole || "USER";
  const displayRoleLabel = statusLabel(displayRole);
  const config = approverDashboardConfig[displayRole] || approverDashboardConfig.HOD;
  const queuePath = isDivisionHead(user)
    ? divisionHeadPath("approvals")
    : isDean(user)
      ? deanPath("approvals")
      : isBecHead(user)
        ? becHeadPath("approvals")
        : isVc(user)
          ? vcPath("approvals")
        : config.queuePath;

  useEffect(() => {
    if (!token || !config?.pendingUrl) return;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest(config.pendingUrl, { token });
        setPendingCount(data?.totalElements ?? data?.content?.length ?? 0);
      } catch (err) {
        setError(err.message || "Dashboard data could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [config, token]);

  useEffect(() => {
    if (!token || (!isDivisionHead(user) && !isDean(user))) return;
    const auditUrl = isDean(user)
      ? "/api/approvals/dean/audit-trail?page=0&size=5"
      : "/api/approvals/hod/audit-trail?page=0&size=5";
    apiRequest(auditUrl, { token })
      .then((data) => setRecentRequests(data?.content || []))
      .catch(() => setRecentRequests([]));
  }, [token, user]);

  const metrics = useMemo(() => [
    { label: "Pending Requests", value: pendingCount ?? 0, icon: RateReviewRoundedIcon },
    { label: "Approval Stage", value: displayRoleLabel, icon: AccountTreeRoundedIcon },
    { label: "Ready to Review", value: pendingCount ? "Yes" : "No", icon: VerifiedRoundedIcon },
  ], [displayRoleLabel, pendingCount]);

  return (
    <div className="space-y-8">
      <section>
        <div className="overflow-hidden rounded-2xl border border-[#2c7895] bg-[linear-gradient(110deg,#123047_0%,#175a75_52%,#6fb8cf_100%)] px-6 py-4 text-white shadow-[0_12px_30px_rgba(15,41,64,0.18)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-100">{displayRoleLabel} Dashboard</div>
          <h1 className="mt-1.5 text-xl font-bold leading-tight tracking-[-0.02em] md:text-2xl">Welcome back, {displayName}.</h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-100/90">
            You are signed in as {displayRoleLabel}. Your workspace shows the approvals connected to your role.
          </p>

          {error && <div className="mt-5 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white">{error}</div>}

          <button
            type="button"
            onClick={() => navigate(queuePath)}
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#f6c453] px-4 py-2 text-sm font-extrabold text-[#0f2940] shadow-sm transition hover:bg-[#efb93c]"
          >
            <RateReviewRoundedIcon fontSize="small" />
            Open Queue
          </button>

          <div className="mt-3 grid gap-2.5 md:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="flex min-w-0 items-center gap-2.5 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/15"><Icon sx={{ fontSize: 18 }} /></div>
                  <div className="min-w-0">
                    <div className="break-words text-lg font-black leading-tight">{loading ? "..." : metric.value}</div>
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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Recent Activity</div>
              <h3 className="mt-2 text-2xl font-bold text-[#10283f]">Recent RRs</h3>
              <p className="mt-1 text-sm text-slate-500">Latest requisitions recorded in your approval workflow.</p>
            </div>
            <button type="button" onClick={() => navigate(isVc(user) ? vcPath("approvals") : isDean(user) ? deanPath("approvals") : isBecHead(user) ? becHeadPath("audit-trail") : divisionHeadPath("audit-trail"))} className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c] hover:bg-[#d9edf5]">
              {isDean(user) || isVc(user) ? "View Approvals" : "View Audit Trail"}
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {recentRequests.length === 0 && (
              <div className="rounded-[20px] bg-[#f5fbff] p-4 text-sm text-slate-600">No recent requisitions are available.</div>
            )}
            {recentRequests.slice(0, 4).map((request) => (
              <div key={request.rrId} className="flex flex-col gap-3 rounded-[20px] border border-[#e1ebf0] bg-[#f8fbfd] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate font-bold text-[#10283f]">{requestDisplayName(request)}</div>
                    {isDean(user) && ["SUBMITTED_TO_BEC", "SUBMITTED_TO_VC"].includes(request.status) ? (
                      <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.1em] ${request.status === "SUBMITTED_TO_BEC" ? "bg-emerald-100 text-emerald-800" : "bg-blue-100 text-blue-800"}`}>
                        {request.status === "SUBMITTED_TO_BEC"
                          ? "Approved by Dean · Submitted to BEC Head"
                          : "Approved by Dean · Submitted to VC"}
                      </span>
                    ) : (
                      <StatusPill status={request.status} />
                    )}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">{request.rrNumber || `RR-${request.rrId}`} · Updated {formatDateTime(request.updatedAt)}</div>
                </div>
                <div className="text-sm font-bold text-[#166e8c]">{formatMoney(request.estimatedTotalAmount)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
