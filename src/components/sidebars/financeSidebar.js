import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

export const bursarSidebarItems = [
  { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Budget Control", icon: AccountBalanceWalletRoundedIcon, path: "/bursar/budgets?tab=budgets" },
  { label: "Budget Approvals", icon: AssignmentTurnedInRoundedIcon, path: "/bursar/budgets?tab=approvals" },
  { label: "Audit Trail", icon: ReceiptLongRoundedIcon, path: "/bursar/audit-trail" },
];

export const financeSidebarItems = [
  { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
];

export const procurementOfficerSidebarItems = [
  ...financeSidebarItems,
  { label: "Tender Workspace", icon: StorefrontRoundedIcon, path: "/procurement/tenders" },
];
