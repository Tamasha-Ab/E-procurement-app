import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import { adminPath } from "../../utils/roleRoutes";

export const adminSidebarItems = [
  { label: "Overview", icon: DashboardRoundedIcon, path: adminPath("dashboard") },
  { label: "Users", icon: PeopleAltRoundedIcon, path: adminPath("users") },
  { label: "Role Requests", icon: ManageAccountsRoundedIcon, path: adminPath("role-requests") },
  { label: "Faculties", icon: AccountBalanceRoundedIcon, path: adminPath("faculties") },
  { label: "Divisions", icon: BusinessRoundedIcon, path: adminPath("divisions") },
  { label: "Notification", icon: NotificationsRoundedIcon, path: adminPath("notifications") },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: adminPath("audit-trail") },
  { label: "Settings", icon: SettingsRoundedIcon, path: adminPath("settings") },
];
