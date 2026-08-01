import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RuleFolderRoundedIcon from "@mui/icons-material/RuleFolderRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

export const bursarSidebarItems = [
  { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: "/tenders" },
  { label: "Tender Budgets", icon: AccountBalanceWalletRoundedIcon, path: "/bursar/budgets" },
  { label: "Tender Workspace", icon: StorefrontRoundedIcon, path: "/bursar/tenders" },
  { label: "Audit Trail", icon: ReceiptLongRoundedIcon, path: "/bursar/audit-trail" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];

export const financeSidebarItems = [
  { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: "/tenders" },
];

export const becSidebarItems = [
  { label: "BEC Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "BEC Approvals", icon: RuleFolderRoundedIcon, path: "/approvals/bec" },
  { label: "Category Lists", icon: ReceiptLongRoundedIcon, path: "/approvals/bec-category-list" },
  { label: "Audit Trail", icon: ReceiptLongRoundedIcon, path: "/approvals/bec/audit-trail" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: "/tenders" },
];

export const procurementOfficerSidebarItems = [
  ...financeSidebarItems,
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
  { label: "Tender Workspace", icon: StorefrontRoundedIcon, path: "/procurement/tenders" },
  { label: "Created RFQs", icon: RuleFolderRoundedIcon, path: "/procurement/rfqs" },
];
