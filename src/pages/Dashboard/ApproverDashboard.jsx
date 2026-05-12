import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, statusLabel } from "../../services/apiClient";
import { approverDashboardConfig, workflowHighlights } from "./dashboardConfig";

export default function ApproverDashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Astraea User";
  const displayRole = user?.subRole || user?.mainRole || "USER";
  const displayRoleLabel = statusLabel(displayRole);
  const config = approverDashboardConfig[displayRole] || approverDashboardConfig.HOD;

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

  const metrics = useMemo(() => [
    { label: "Pending Requests", value: pendingCount ?? 0, icon: RateReviewRoundedIcon },
    { label: "Approval Stage", value: displayRoleLabel, icon: AccountTreeRoundedIcon },
    { label: "Ready to Review", value: pendingCount ? "Yes" : "No", icon: VerifiedRoundedIcon },
  ], [displayRoleLabel, pendingCount]);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-8 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">{displayRoleLabel} Dashboard</div>
          <h1 className="mt-4 text-4xl font-black leading-tight">Welcome back, {displayName}.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-100/90">
            You are signed in as {displayRoleLabel}. Your workspace shows the approvals connected to your role.
          </p>

          {error && <div className="mt-5 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white">{error}</div>}

          <button
            type="button"
            onClick={() => navigate(config.queuePath)}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#f6c453] px-5 py-3 text-sm font-extrabold text-[#0f2940] shadow-[0_14px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#efb93c]"
          >
            <RateReviewRoundedIcon fontSize="small" />
            Open Queue
          </button>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="min-w-0 rounded-[24px] bg-white/10 p-4 backdrop-blur">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Icon /></div>
                  <div className="mt-5 break-words text-2xl font-black leading-tight sm:text-3xl">{loading ? "..." : metric.value}</div>
                  <div className="mt-1 text-sm text-slate-200">{metric.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-8 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Next Action</div>
          <h2 className="mt-3 text-2xl font-bold text-[#10283f]">{config.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">{config.nextAction}</p>
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

      <section>
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Operational Focus</div>
          <h3 className="mt-2 text-2xl font-bold text-[#10283f]">What happens next</h3>
          <div className="mt-6 rounded-[24px] bg-[#f5fbff] p-5">
            <div className="text-sm font-semibold text-[#166e8c]">{pendingCount ?? 0} pending request{pendingCount === 1 ? "" : "s"}</div>
            <div className="mt-3 text-4xl font-black text-[#10283f]">{pendingCount ?? 0}</div>
            <div className="mt-2 text-sm leading-7 text-slate-600">Open your queue or tender workspace to continue the procurement process.</div>
          </div>
        </div>
      </section>
    </div>
  );
}
