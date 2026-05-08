import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import StatusPill from "../../components/StatusPill";

const APPROVER_DASHBOARDS = {
  HOD: {
    pendingUrl: "/api/approvals/hod/pending?page=0&size=1",
    queuePath: "/approvals/hod",
    title: "HOD approval queue",
    nextAction: "Review departmental requests waiting for your decision.",
  },
  DEAN: {
    pendingUrl: "/api/approvals/dean/pending?page=0&size=1",
    queuePath: "/approvals/dean",
    title: "Dean approval queue",
    nextAction: "Validate faculty-level requisitions before technical review.",
  },
  TEC: {
    pendingUrl: "/api/approvals/tec/pending?page=0&size=1",
    queuePath: "/approvals/tec",
    title: "Technical review queue",
    nextAction: "Add request specifications or continue tender evaluation.",
  },
  VC: {
    pendingUrl: "/api/approvals/vc/pending?page=0&size=1",
    queuePath: "/approvals/vc",
    title: "VC approval queue",
    nextAction: "Approve requests, specifications, and offer decisions assigned to you.",
  },
};

const emptyStaffStats = {
  totalRequests: 0,
  draftRequests: 0,
  submittedRequests: 0,
  inProgressRequests: 0,
  approvedRequests: 0,
  rejectedRequests: 0,
  completedRequests: 0,
  recentRequests: [],
};

const workflowHighlights = [
  "Staff creates RR with item details and justification.",
  "HOD and Dean review the request with comments.",
  "TEC, VC, Bursar, and Procurement continue the approved workflow.",
];

const bursarFeatureCards = [
  {
    title: "Annual Budgets",
    detail: "Create department allocations and monitor available funds.",
    icon: AccountBalanceWalletRoundedIcon,
    path: "/bursar/budgets?tab=budgets",
    tone: "bg-[#edf7fb] text-[#166e8c]",
  },
  {
    title: "Available Balance",
    detail: "Check remaining budget before approving a requisition.",
    icon: SearchRoundedIcon,
    path: "/bursar/budgets?tab=available",
    tone: "bg-[#eaf7f4] text-[#14745f]",
  },
  {
    title: "Pending Approvals",
    detail: "Review requisitions waiting at the Bursar stage.",
    icon: PaymentsRoundedIcon,
    path: "/bursar/budgets?tab=approvals",
    tone: "bg-[#fff1c7] text-[#b47a00]",
  },
  {
    title: "Audit Trail",
    detail: "View finance approval history and comments.",
    icon: HistoryRoundedIcon,
    path: "/bursar/audit-trail",
    tone: "bg-slate-100 text-[#10283f]",
  },
];

const isStaffRole = (user) => {
  const role = user?.subRole || user?.mainRole;
  return !APPROVER_DASHBOARDS[role] && user?.mainRole !== "FINANCE" && user?.mainRole !== "VENDOR";
};

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [staffStats, setStaffStats] = useState(emptyStaffStats);
  const [pendingCount, setPendingCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.username || "Astraea User";
  const displayRole = user?.subRole || user?.mainRole || "USER";
  const approverConfig = APPROVER_DASHBOARDS[displayRole];
  const staffView = isStaffRole(user);
  const isBursar = user?.mainRole === "FINANCE" && user?.subRole === "BURSAR";
  const isProcurementOfficer = user?.mainRole === "FINANCE" && user?.subRole === "PROCUREMENT_OFFICER";

  useEffect(() => {
    if (!token) return;

    const loadDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        if (staffView) {
          const data = await apiRequest("/api/staff/dashboard", { token });
          setStaffStats({ ...emptyStaffStats, ...data });
        } else if (approverConfig) {
          const data = await apiRequest(approverConfig.pendingUrl, { token });
          setPendingCount(data?.totalElements ?? data?.content?.length ?? 0);
        }
      } catch (err) {
        setError(err.message || "Dashboard data could not be loaded.");
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [approverConfig, staffView, token]);

  const metrics = useMemo(() => {
    if (staffView) {
      return [
        { label: "Total Requests", value: staffStats.totalRequests, icon: Inventory2RoundedIcon },
        { label: "Draft Requests", value: staffStats.draftRequests, icon: AccessTimeRoundedIcon },
        { label: "In Progress", value: staffStats.inProgressRequests, icon: AccountTreeRoundedIcon },
        { label: "Approved", value: staffStats.approvedRequests, icon: TaskAltRoundedIcon },
      ];
    }

    if (approverConfig) {
      return [
        { label: "Pending Requests", value: pendingCount ?? 0, icon: RateReviewRoundedIcon },
        { label: "Approval Stage", value: displayRole, icon: AccountTreeRoundedIcon },
        { label: "Ready to Review", value: pendingCount ? "Yes" : "No", icon: VerifiedRoundedIcon },
      ];
    }

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
  }, [approverConfig, displayRole, isProcurementOfficer, pendingCount, staffStats, staffView]);

  const primaryAction = staffView
    ? { label: "Create Requisition", path: "/requisition/create", icon: AddCircleRoundedIcon }
    : approverConfig
      ? { label: "Open Queue", path: approverConfig.queuePath, icon: RateReviewRoundedIcon }
      : isProcurementOfficer
        ? { label: "Open Tender Workspace", path: "/procurement/tenders", icon: StorefrontRoundedIcon }
        : user?.mainRole === "VENDOR"
          ? { label: "Open Tender Workspace", path: "/vendor/tenders", icon: StorefrontRoundedIcon }
          : null;

  const PrimaryActionIcon = primaryAction?.icon;
  const recentRequests = staffStats.recentRequests || [];

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="overflow-hidden rounded-[34px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-8 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
          <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-100">Dashboard</div>
          <h1 className="mt-4 text-4xl font-black leading-tight">Welcome back, {displayName}.</h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-100/90">
            You are signed in as {statusLabel(displayRole)}. Your workspace shows the actions connected to your role.
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white">
              {error}
            </div>
          )}

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
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
                    <Icon />
                  </div>
                  <div className="mt-5 text-3xl font-black">{loading ? "..." : metric.value}</div>
                  <div className="mt-1 text-sm text-slate-200">{metric.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-8 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Next Action</div>
          <h2 className="mt-3 text-2xl font-bold text-[#10283f]">
            {staffView ? "Start or track a requisition" : approverConfig?.title || "Astraea workspace"}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {staffView
              ? "Create a new RR, save it as a draft, submit it to HOD, or check comments on returned requests."
              : approverConfig?.nextAction || "Use the sidebar to open the module assigned to your role."}
          </p>

          <div className="mt-7 space-y-4">
            {workflowHighlights.map((item, index) => (
              <div key={item} className="flex gap-4 rounded-[24px] bg-slate-50 p-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#0f2940] text-sm font-bold text-white">
                  {index + 1}
                </div>
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
            <div className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">
              Budget Control
            </div>
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
                  <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.tone}`}>
                    <Icon fontSize="small" />
                  </span>
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
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">
                {staffView ? "Recent Requests" : "Operational Focus"}
              </div>
              <h3 className="mt-2 text-2xl font-bold text-[#10283f]">
                {staffView ? "Your latest requisitions" : "What happens next"}
              </h3>
            </div>
            {staffView && (
              <button
                type="button"
                onClick={() => navigate("/requisitions")}
                className="rounded-full bg-[#edf7fb] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]"
              >
                View All
              </button>
            )}
          </div>

          <div className="mt-6 space-y-3">
            {staffView && recentRequests.length > 0 ? (
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
                  <div className="mt-3 text-sm font-semibold text-[#166e8c]">
                    {formatMoney(request.estimatedTotalAmount || request.totalAmount)}
                  </div>
                </button>
              ))
            ) : (
              <div className="rounded-[24px] bg-[#f5fbff] p-5">
                <div className="text-sm font-semibold text-[#166e8c]">
                  {staffView ? "No recent requisitions yet" : `${pendingCount ?? 0} pending request${pendingCount === 1 ? "" : "s"}`}
                </div>
                <div className="mt-3 text-4xl font-black text-[#10283f]">
                  {staffView ? staffStats.totalRequests : pendingCount ?? 0}
                </div>
                <div className="mt-2 text-sm leading-7 text-slate-600">
                  {staffView
                    ? "Create your first requisition request to begin the Staff workflow."
                    : "Open your queue or tender workspace to continue the procurement process."}
                </div>
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
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff1c7] text-[#b47a00]">
                <ErrorOutlineRoundedIcon />
              </div>
              <div className="mt-4 text-sm font-semibold text-[#10283f]">Supplier Readiness</div>
              <div className="mt-1 text-sm text-slate-600">Approved requests can continue into RFQ, bids, offer letters, and PO creation.</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
