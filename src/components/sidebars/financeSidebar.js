import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import RuleFolderRoundedIcon from "@mui/icons-material/RuleFolderRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { seniorAssistantBursarPath } from "../../utils/roleRoutes";

export const bursarSidebarItems = [
  { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Tender creation", icon: AccountBalanceWalletRoundedIcon, path: "/bursar/budgets" },
  { label: "Tender Records", icon: StorefrontRoundedIcon, path: "/tenders" },
  { label: "Received RR Lists", icon: PlaylistAddCheckRoundedIcon, path: "/finance/received-rr-lists", activePaths: ["/finance/category-rr"] },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: "/role-requests" },
  { label: "Audit Trail", icon: ReceiptLongRoundedIcon, path: "/finance/audit-trail" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];

export const seniorAssistantBursarSidebarItems = [
  { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: seniorAssistantBursarPath("dashboard") },
  { label: "Tender creation", icon: AccountBalanceWalletRoundedIcon, path: seniorAssistantBursarPath("tender-creation") },
  { label: "Tender Records", icon: StorefrontRoundedIcon, path: seniorAssistantBursarPath("tender-records") },
  {
    label: "Received RR Lists",
    icon: PlaylistAddCheckRoundedIcon,
    path: seniorAssistantBursarPath("received-rr-lists"),
    activePaths: [seniorAssistantBursarPath("received-rr")],
  },
  { label: "Audit Trail", icon: ReceiptLongRoundedIcon, path: seniorAssistantBursarPath("audit-trail") },
  { label: "Notification", icon: NotificationsRoundedIcon, path: seniorAssistantBursarPath("notifications") },
  { label: "Settings", icon: SettingsRoundedIcon, path: seniorAssistantBursarPath("settings") },
];

export const financeSidebarItems = [
  { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: "/tenders" },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: "/role-requests" },
  { label: "Audit Trail", icon: ReceiptLongRoundedIcon, path: "/finance/audit-trail" },
];

export const becHeadSidebarItems = [
  { label: "BEC Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "BEC Approvals", icon: RuleFolderRoundedIcon, path: "/approvals/bec" },
  { label: "Category Lists", icon: ReceiptLongRoundedIcon, path: "/approvals/bec-category-list" },
  { label: "BEC Category Assignment", icon: ManageAccountsRoundedIcon, path: "/approvals/bec/category-assignment" },
  { label: "Quotation Review", icon: PlaylistAddCheckRoundedIcon, path: "/approvals/bec/quotations" },
  { label: "Vendor Review", icon: RuleFolderRoundedIcon, path: "/approvals/bec/vendor-review" },
  { label: "Selected Vendors", icon: PlaylistAddCheckRoundedIcon, path: "/approvals/bec/selected-vendors" },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: "/role-requests" },
  { label: "Audit Trail", icon: ReceiptLongRoundedIcon, path: "/finance/audit-trail" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: "/tenders" },
];

export const becSidebarItems = [
  { label: "BEC Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Assigned Quotations", icon: PlaylistAddCheckRoundedIcon, path: "/approvals/bec/assigned-quotations" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];

export const procurementOfficerSidebarItems = [
  ...financeSidebarItems,
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
  { label: "Tender Workspace", icon: StorefrontRoundedIcon, path: "/procurement/tenders" },
  { label: "Created RFQs", icon: RuleFolderRoundedIcon, path: "/procurement/rfqs" },
];
