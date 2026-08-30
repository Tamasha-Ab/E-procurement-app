import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { staffMemberPath } from "../../utils/roleRoutes";

export const staffSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: staffMemberPath("dashboard") },
  { label: "Create Requisition", icon: AddCircleRoundedIcon, path: staffMemberPath("create-requisition") },
  { label: "My Requisitions", icon: AssignmentTurnedInRoundedIcon, path: staffMemberPath("my-requisitions") },
  { label: "Tenders", icon: StorefrontRoundedIcon, path: staffMemberPath("tenders") },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: staffMemberPath("role-requests") },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: staffMemberPath("audit-trail") },
  { label: "Notification", icon: NotificationsRoundedIcon, path: staffMemberPath("notifications") },
  { label: "Settings", icon: SettingsRoundedIcon, path: staffMemberPath("settings") },
];
