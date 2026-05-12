import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { useAuth } from "../../contexts/AuthContext";
import { statusLabel } from "../../services/apiClient";
import { bursarFeatureCards, workflowHighlights } from "./dashboardConfig";

export default function FinanceDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Astraea User";
  const displayRole = user?.subRole || user?.mainRole || "FINANCE";
  const isBursar = user?.subRole === "BURSAR";
  const isProcurementOfficer = user?.subRole === "PROCUREMENT_OFFICER";

  const metrics = useMemo(() => {
    if (isProcurementOfficer) {
      return [
        { label: "RFQ Setup", value: "Ready", icon: StorefrontRoundedIcon },
        { label: "Vendor Invites", value: "Active", icon: Inventory2RoundedIcon },
        { label: "PO Tracking", value: "Open", icon: VerifiedRoundedIcon },
      ];
    }

    return [
      { label: "Workspace", value: "Active", icon: TrendingUpRoundedIcon },
      { label: "Requests", value: "Open", icon: Inventory2RoundedIcon },
      { label: "Workflow", value: "Online", icon: VerifiedRoundedIcon },
    ];
  }, [isProcurementOfficer]);

  const primaryAction = isProcurementOfficer
    ? { label: "Open Tender Workspace", path: "/procurement/tenders", icon: StorefrontRoundedIcon }
    : null;
  const PrimaryActionIcon = primaryAction?.icon;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-8 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
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
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-8 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Next Action</div>
          <h2 className="mt-3 text-2xl font-bold text-[#10283f]">Astraea workspace</h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">Use the sidebar to open the module assigned to your role.</p>
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

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)] lg:col-span-2">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Operational Focus</div>
          <h3 className="mt-2 text-2xl font-bold text-[#10283f]">What happens next</h3>
          <div className="mt-6 rounded-[24px] bg-[#f5fbff] p-5">
            <div className="text-sm font-semibold text-[#166e8c]">Finance workspace</div>
            <div className="mt-3 text-4xl font-black text-[#10283f]">Active</div>
            <div className="mt-2 text-sm leading-7 text-slate-600">Open your finance or procurement workspace to continue the process.</div>
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
              <div className="text-sm font-semibold text-[#10283f]">Tender Notifications</div>
              <div className="mt-1 text-sm text-slate-600">New tenders notify staff members, division heads, and TEC officers immediately.</div>
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
