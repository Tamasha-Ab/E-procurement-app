import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import { useAuth } from "../../contexts/AuthContext";

const getMetrics = (user) => {
  const role = user?.subRole || user?.mainRole;

  if (role === "BURSAR" || user?.mainRole === "FINANCE") {
    return [
      { label: "Budget Checks", value: "18", icon: TrendingUpRoundedIcon },
      { label: "Reserved Funds", value: "LKR 12.4M", icon: Inventory2RoundedIcon },
      { label: "Awaiting Release", value: "06", icon: AccessTimeRoundedIcon },
    ];
  }

  if (role === "TEC") {
    return [
      { label: "Technical Reviews", value: "09", icon: AccountTreeRoundedIcon },
      { label: "Spec Drafts", value: "04", icon: Inventory2RoundedIcon },
      { label: "Qualified Bids", value: "13", icon: VerifiedRoundedIcon },
    ];
  }

  return [
    { label: "Active Requests", value: "12", icon: Inventory2RoundedIcon },
    { label: "Approvals in Motion", value: "07", icon: AccountTreeRoundedIcon },
    { label: "Completed This Month", value: "23", icon: TaskAltRoundedIcon },
  ];
};

const workflowHighlights = [
  { title: "Requisition Request", detail: "Staff initiate departmental requirements with justification and estimated value." },
  { title: "Approval Journey", detail: "HOD, Dean, TEC, VC, and Bursar actions remain visible with timestamps and comments." },
  { title: "Procurement Readiness", detail: "Approved requests progress to quotations, purchase orders, GRN, and payment tracking." },
];

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Astraea User";
  const displayRole = user?.subRole || user?.mainRole || "USER";
  const metrics = getMetrics(user);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-8 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">Dashboard</div>
          <h1 className="mt-4 text-4xl font-black leading-tight">
            Welcome back, {displayName}.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-100/90">
            You are signed in as {displayRole}. This workspace is designed around Astraea’s procurement approval,
            finance, and supplier lifecycle so your next action is always visible.
          </p>

          <div className="grid gap-4 mt-8 md:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                    <Icon />
                  </div>
                  <div className="mt-5 text-3xl font-black">{metric.value}</div>
                  <div className="mt-1 text-sm text-slate-200">{metric.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-8 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Live Workflow</div>
          <h2 className="mt-3 text-2xl font-bold text-[#10283f]">Astraea procurement path</h2>

          <div className="mt-6 space-y-4">
            {workflowHighlights.map((item, index) => (
              <div key={item.title} className="flex gap-4 rounded-[24px] bg-slate-50 p-4">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#0f2940] text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <div className="text-base font-semibold text-[#10283f]">{item.title}</div>
                  <div className="mt-1 text-sm leading-7 text-slate-600">{item.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)] lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Operational Focus</div>
              <h3 className="mt-2 text-2xl font-bold text-[#10283f]">What happens next</h3>
            </div>
            <div className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">
              Active Cycle
            </div>
          </div>

          <div className="grid gap-4 mt-6 md:grid-cols-2">
            <div className="rounded-[24px] bg-[#f5fbff] p-5">
              <div className="text-sm font-semibold text-[#166e8c]">Pending Reviews</div>
              <div className="mt-3 text-4xl font-black text-[#10283f]">07</div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                Requests currently waiting for the next approval or budget verification action.
              </div>
            </div>

            <div className="rounded-[24px] bg-[#fff9ec] p-5">
              <div className="text-sm font-semibold text-[#b47a00]">RFQ / Tender Progress</div>
              <div className="mt-3 text-4xl font-black text-[#10283f]">05</div>
              <div className="mt-2 text-sm leading-7 text-slate-600">
                Procurement cases moving from technical specification to vendor response and selection.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Today’s Snapshot</div>
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
              <div className="text-sm font-semibold text-[#10283f]">Supplier Readiness</div>
              <div className="mt-1 text-sm text-slate-600">Approved requests can continue into quotations, PO creation, and GRN capture.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
