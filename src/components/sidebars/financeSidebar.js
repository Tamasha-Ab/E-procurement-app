import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RuleFolderRoundedIcon from "@mui/icons-material/RuleFolderRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

export const bursarSidebarItems = [
  { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Tender Budgets", icon: AccountBalanceWalletRoundedIcon, path: "/bursar/budgets" },
  { label: "Audit Trail", icon: ReceiptLongRoundedIcon, path: "/bursar/audit-trail" },
];

export const financeSidebarItems = [
  { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
];

export const procurementOfficerSidebarItems = [
  ...financeSidebarItems,
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
  { label: "Tender Workspace", icon: StorefrontRoundedIcon, path: "/procurement/tenders" },
  { label: "Created RFQs", icon: RuleFolderRoundedIcon, path: "/procurement/rfqs" },
];
