import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import EngineeringRoundedIcon from "@mui/icons-material/EngineeringRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { deanPath, divisionHeadPath } from "../../utils/roleRoutes";

export const divisionHeadSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: divisionHeadPath("dashboard") },
  { label: "Division Head Approvals", icon: AssignmentTurnedInRoundedIcon, path: divisionHeadPath("approvals") },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: divisionHeadPath("audit-trail") },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: divisionHeadPath("tenders") },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: divisionHeadPath("role-requests") },
  { label: "Notification", icon: NotificationsRoundedIcon, path: divisionHeadPath("notifications") },
  { label: "Settings", icon: SettingsRoundedIcon, path: divisionHeadPath("settings") },
];

export const hodSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Division Head Approvals", icon: AssignmentTurnedInRoundedIcon, path: "/approvals/hod" },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: "/approvals/hod/audit-trail" },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: "/tenders" },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: "/role-requests" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];

export const tecSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Technical Reviews", icon: EngineeringRoundedIcon, path: "/approvals/tec" },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: "/approvals/tec/audit-trail" },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: "/tenders" },
  { label: "Tender Evaluation", icon: StorefrontRoundedIcon, path: "/procurement/tenders" },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: "/role-requests" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];

export const deanSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: deanPath("dashboard") },
  { label: "Dean Approvals", icon: AssignmentTurnedInRoundedIcon, path: deanPath("approvals") },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: deanPath("audit-trail") },
  { label: "Quotation Approval", icon: GavelRoundedIcon, path: deanPath("quotation-approval") },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: deanPath("tenders") },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: deanPath("role-requests") },
  { label: "Notification", icon: NotificationsRoundedIcon, path: deanPath("notifications") },
  { label: "Settings", icon: SettingsRoundedIcon, path: deanPath("settings") },
];

export const vcSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "VC Approvals", icon: AssignmentTurnedInRoundedIcon, path: "/approvals/vc" },
  { label: "Quotation Approval", icon: GavelRoundedIcon, path: "/approvals/quotation-authority" },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: "/role-requests" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];

export const approverSidebarItemsByRole = {
  DIVISION_HEAD: divisionHeadSidebarItems,
  HOD: hodSidebarItems,
  DEAN: deanSidebarItems,
  VC: vcSidebarItems,
  TEC: tecSidebarItems,
};
