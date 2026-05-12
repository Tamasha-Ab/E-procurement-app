import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import EngineeringRoundedIcon from "@mui/icons-material/EngineeringRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";

export const hodSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Division Head Approvals", icon: AssignmentTurnedInRoundedIcon, path: "/approvals/hod" },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: "/approvals/hod/audit-trail" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];

export const tecSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Technical Reviews", icon: EngineeringRoundedIcon, path: "/approvals/tec" },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: "/approvals/tec/audit-trail" },
  { label: "Tender Evaluation", icon: StorefrontRoundedIcon, path: "/procurement/tenders" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];

export const approverSidebarItemsByRole = {
  DIVISION_HEAD: hodSidebarItems,
  HOD: hodSidebarItems,
  TEC: tecSidebarItems,
};
