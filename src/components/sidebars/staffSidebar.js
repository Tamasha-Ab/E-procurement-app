import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

export const staffSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Create Requisition", icon: AddCircleRoundedIcon, path: "/requisition/create" },
  { label: "My Requisitions", icon: AssignmentTurnedInRoundedIcon, path: "/requisitions" },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: "/tenders" },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: "/staff/audit-trail" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];
