import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import TaskAltRoundedIcon from "@mui/icons-material/TaskAltRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
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
    nextAction: "Add specifications and recommend the procurement method.",
  },
  VC: {
    pendingUrl: "/api/approvals/vc/pending?page=0&size=1",
    queuePath: "/approvals/vc",
    title: "VC approval queue",
    nextAction: "Approve requests before bursar budget verification.",
  },
};

const isStaffRole = (user) => {
  const role = user?.subRole || user?.mainRole;
  return !APPROVER_DASHBOARDS[role] && user?.mainRole !== "FINANCE" && user?.mainRole !== "VENDOR";
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

    return [
      { label: "Workspace", value: "Active", icon: TrendingUpRoundedIcon },
      { label: "Requests", value: "Open", icon: Inventory2RoundedIcon },
      { label: "Workflow", value: "Online", icon: VerifiedRoundedIcon },
    ];
  }, [approverConfig, displayRole, pendingCount, staffStats, staffView]);

  const primaryAction = staffView
    ? { label: "Create Requisition", path: "/requisition/create", icon: AddCircleRoundedIcon }
    : approverConfig
      ? { label: "Open Queue", path: approverConfig.queuePath, icon: RateReviewRoundedIcon }
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
            You are signed in as {displayRole}. Your workspace shows the requisition and approval actions connected to your role.
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-sm text-white">
              {error}
            </div>
          )}

          <div className="grid gap-4 mt-8 md:grid-cols-4">
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
              ? "Create a new RR, save it as a draft, submit it to HOD, or check comments on returned and rejected requests."
              : approverConfig?.nextAction || "Use the sidebar to open the module assigned to your role."}
          </p>

          {primaryAction && (
            <button
              type="button"
              onClick={() => navigate(primaryAction.path)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#10283f] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_28px_rgba(15,41,64,0.18)] transition hover:bg-[#166e8c]"
            >
              <PrimaryActionIcon fontSize="small" />
              {primaryAction.label}
            </button>
          )}

          <div className="mt-7 space-y-4">
            {[
              "Staff creates RR with item details and justification.",
              "HOD and Dean review the request with comments.",
              "TEC adds specifications and VC completes approval.",
            ].map((item, index) => (
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

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)] lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">
                {staffView ? "Recent Requests" : "Approval Focus"}
              </div>
              <h3 className="mt-2 text-2xl font-bold text-[#10283f]">
                {staffView ? "Your latest requisitions" : "Requests waiting for action"}
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
                    : "Open your approval queue from the sidebar or the button above to review requests."}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">
            {staffView ? "Status Snapshot" : "Approval Summary"}
          </div>
          <div className="mt-4 space-y-4">
            {staffView ? (
              [
                ["Submitted", staffStats.submittedRequests],
                ["Rejected", staffStats.rejectedRequests],
                ["Completed", staffStats.completedRequests],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[22px] bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-[#10283f]">{label}</div>
                  <div className="mt-1 text-2xl font-black text-[#166e8c]">{value}</div>
                </div>
              ))
            ) : (
              [
                ["Pending Requests", pendingCount ?? 0],
                ["Current Stage", statusLabel(displayRole)],
                [displayRole === "TEC" ? "Review Action" : "Decision Actions", displayRole === "TEC" ? "Complete Review" : "Approve / Return / Reject"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[22px] bg-slate-50 p-4">
                  <div className="text-sm font-semibold text-[#10283f]">{label}</div>
                  <div className="mt-1 text-lg font-black text-[#166e8c]">{value}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
