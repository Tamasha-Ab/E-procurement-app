import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

export const approverDashboardConfig = {
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

export const emptyStaffStats = {
  totalRequests: 0,
  draftRequests: 0,
  submittedRequests: 0,
  inProgressRequests: 0,
  approvedRequests: 0,
  rejectedRequests: 0,
  completedRequests: 0,
  recentRequests: [],
};

export const workflowHighlights = [
  "Staff creates RR with item details and justification.",
  "HOD and Dean review the request with comments.",
  "TEC, VC, Bursar, and Procurement continue the approved workflow.",
];

export const bursarFeatureCards = [
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
