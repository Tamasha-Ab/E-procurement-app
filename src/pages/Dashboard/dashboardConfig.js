import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PaymentsRoundedIcon from "@mui/icons-material/PaymentsRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";

export const approverDashboardConfig = {
  DIVISION_HEAD: {
    pendingUrl: "/api/approvals/hod/pending?page=0&size=1",
    queuePath: "/approvals/hod",
    title: "Division Head approval queue",
    nextAction: "Review division requests waiting for your decision.",
  },
  HOD: {
    pendingUrl: "/api/approvals/hod/pending?page=0&size=1",
    queuePath: "/approvals/hod",
    title: "Division Head approval queue",
    nextAction: "Review division requests waiting for your decision.",
  },
  TEC: {
    pendingUrl: "/api/approvals/tec/pending?page=0&size=1",
    queuePath: "/approvals/tec",
    title: "Technical review queue",
    nextAction: "Review Division Head specifications and route approved requests to Bursar.",
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
  "Division Head reviews the request and submits accepted RRs to TEC.",
  "TEC, Bursar, and Procurement continue the approved workflow.",
];

export const bursarFeatureCards = [
  {
    title: "Create Tender",
    detail: "Create tender value records and notify internal users immediately.",
    icon: AccountBalanceWalletRoundedIcon,
    path: "/bursar/budgets",
    tone: "bg-[#edf7fb] text-[#166e8c]",
  },
  {
    title: "Available Balance",
    detail: "Check tender balance before approving a requisition.",
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
