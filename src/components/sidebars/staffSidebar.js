import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";

export const staffSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Create Requisition", icon: AddCircleRoundedIcon, path: "/requisition/create" },
  { label: "My Requisitions", icon: AssignmentTurnedInRoundedIcon, path: "/requisitions" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];
