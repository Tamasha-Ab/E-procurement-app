import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, statusLabel } from "../../services/apiClient";
import { bursarFeatureCards } from "./dashboardConfig";
import { getSeniorAssistantBursarPath } from "../../utils/roleRoutes";

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
  const rolePath = (page, fallback) => getSeniorAssistantBursarPath(user, page, fallback);
  const featureCardPath = (path) => {
    if (path.startsWith("/bursar/budgets")) {
      const query = path.includes("?") ? path.slice(path.indexOf("?")) : "";
      return `${rolePath("tender-creation", "/bursar/budgets")}${query}`;
    }
    if (path === "/bursar/audit-trail") return rolePath("audit-trail", path);
    return path;
  };

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-[#2c7895] bg-[linear-gradient(110deg,#123047_0%,#175a75_52%,#6fb8cf_100%)] px-6 py-5 text-white shadow-[0_12px_30px_rgba(15,41,64,0.18)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-cyan-100">Finance dashboard</div>
            <h1 className="mt-2 text-2xl font-bold tracking-[-0.02em] text-white">Welcome back, {displayName}</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-100/90">
              Review finance activity, requisition lists and tender work assigned to your account.
            </p>
          </div>
          <div className="flex items-center gap-3 md:justify-end">
            {primaryAction && (
              <button type="button" onClick={() => navigate(primaryAction.path)} className="inline-flex items-center gap-2 rounded-xl bg-[#166e8c] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#125d77]">
                <PrimaryActionIcon fontSize="small" />{primaryAction.label}
              </button>
            )}
          </div>
        </div>

        {isProcurementOfficer && (
          <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-[#166e8c] shadow-sm"><Icon /></div>
                  <div className="mt-3 text-xl font-bold text-[#10283f]">{metric.value}</div>
                  <div className="mt-1 text-sm text-slate-500">{metric.label}</div>
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
              label="Received RR Lists"
              value={summary.pendingRrs}
              helper="BEC submitted category-wise RRs"
              onClick={() => navigate(rolePath("received-rr-lists", "/finance/received-rr-lists"))}
            />
            <SummaryTile
              label="Final RR List"
              value={summary.finalRrs}
              helper="Approved or procurement-ready RRs"
              onClick={() => navigate(rolePath("tender-creation", "/bursar/budgets"))}
            />
            <SummaryTile
              label="Notifications"
              value={summary.unreadNotifications}
              helper="Unread workspace notices"
              onClick={() => navigate(rolePath("notifications", "/notifications"))}
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
                  onClick={() => navigate(featureCardPath(card.path))}
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
