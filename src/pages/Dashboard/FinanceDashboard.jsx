import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, statusLabel } from "../../services/apiClient";
import { bursarFeatureCards } from "./dashboardConfig";

const bursarWorkspaceRoles = ["BURSAR", "ASSISTANT_BURSAR", "SENIOR_ASSISTANT_BURSAR"];

export default function FinanceDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Astraea User";
  const displayRole = user?.subRole || user?.mainRole || "FINANCE";
  const isBursar = user?.subRole === "BURSAR";
  const isBursarWorkspace = bursarWorkspaceRoles.includes(user?.subRole);
  const isProcurementOfficer = user?.subRole === "PROCUREMENT_OFFICER";
  const [summary, setSummary] = useState({
    pendingRrs: 0,
    finalRrs: 0,
    unreadNotifications: 0,
  });

  const metrics = useMemo(() => {
    if (isProcurementOfficer) {
      return [
        { label: "RFQ Setup", value: "Ready", icon: StorefrontRoundedIcon },
        { label: "Vendor Invites", value: "Active", icon: Inventory2RoundedIcon },
        { label: "PO Tracking", value: "Open", icon: VerifiedRoundedIcon },
      ];
    }

    return [];
  }, [isProcurementOfficer]);

  useEffect(() => {
    if (!token || !isBursarWorkspace) return;

    Promise.all([
      apiRequest("/api/tenders/bursar/requisitions/pending", { token }),
      apiRequest("/api/tenders/bursar/requisitions/final", { token }),
      apiRequest("/api/notifications/my/unread-count", { token }),
    ])
      .then(([pending, finalList, unread]) => {
        setSummary({
          pendingRrs: Array.isArray(pending) ? pending.length : 0,
          finalRrs: Array.isArray(finalList) ? finalList.length : 0,
          unreadNotifications: Number(unread?.unreadCount || 0),
        });
      })
      .catch(() => {
        setSummary({ pendingRrs: 0, finalRrs: 0, unreadNotifications: 0 });
      });
  }, [token, isBursarWorkspace]);

  const primaryAction = isProcurementOfficer
    ? { label: "Open Tender Workspace", path: "/procurement/tenders", icon: StorefrontRoundedIcon }
    : null;
  const PrimaryActionIcon = primaryAction?.icon;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-8 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
        <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">Finance Dashboard</div>
        <h1 className="mt-4 text-4xl font-black leading-tight">Welcome back, {displayName}.</h1>
        <p className="mt-4 max-w-2xl text-base leading-8 text-slate-100/90">
          You are signed in as {statusLabel(displayRole)}. Your workspace shows the finance actions connected to your role.
        </p>

        {primaryAction && (
          <button
            type="button"
            onClick={() => navigate(primaryAction.path)}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#f6c453] px-5 py-3 text-sm font-extrabold text-[#0f2940] shadow-[0_14px_30px_rgba(0,0,0,0.12)] transition hover:bg-[#efb93c]"
          >
            <PrimaryActionIcon fontSize="small" />
            {primaryAction.label}
          </button>
        )}

        {isProcurementOfficer && (
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15"><Icon /></div>
                  <div className="mt-5 text-3xl font-black">{metric.value}</div>
                  <div className="mt-1 text-sm text-slate-200">{metric.label}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {isBursarWorkspace && (
        <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Bursar Workspace Summary</div>
              <h2 className="mt-2 text-2xl font-bold text-[#10283f]">Finance review overview</h2>
            </div>
            <div className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">
              {statusLabel(displayRole)}
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <SummaryTile
              label="Finance Department RRs"
              value={summary.pendingRrs}
              helper="Waiting at finance review"
              onClick={() => navigate("/bursar/budgets?tab=approvals")}
            />
            <SummaryTile
              label="Final RR List"
              value={summary.finalRrs}
              helper="Approved or procurement-ready RRs"
              onClick={() => navigate("/bursar/budgets")}
            />
            <SummaryTile
              label="Notifications"
              value={summary.unreadNotifications}
              helper="Unread workspace notices"
              onClick={() => navigate("/notifications")}
            />
          </div>
        </section>
      )}

      {isBursar && (
        <section className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Bursar Tools</div>
              <h3 className="mt-2 text-2xl font-bold text-[#10283f]">Finance actions you can take</h3>
            </div>
            <div className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Budget Control</div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {bursarFeatureCards.map((card) => {
              const Icon = card.icon;
              return (
                <button
                  key={card.title}
                  type="button"
                  onClick={() => navigate(card.path)}
                  className="min-h-[210px] rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5 text-left transition hover:-translate-y-1 hover:border-[#166e8c] hover:shadow-[0_18px_45px_rgba(15,41,64,0.10)]"
                >
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.tone}`}><Icon fontSize="small" /></span>
                  <div className="mt-5 text-lg font-bold text-[#10283f]">{card.title}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">{card.detail}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryTile({ label, value, helper, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-[24px] border border-[#e0ebf1] bg-[#fbfdff] p-5 text-left transition hover:-translate-y-1 hover:border-[#166e8c] hover:shadow-[0_18px_45px_rgba(15,41,64,0.10)] focus:outline-none focus:ring-2 focus:ring-[#166e8c]/30"
    >
      <div className="text-sm font-semibold text-[#166e8c]">{label}</div>
      <div className="mt-4 text-4xl font-black text-[#10283f]">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{helper}</div>
    </button>
  );
}
