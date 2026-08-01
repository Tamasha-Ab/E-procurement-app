import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";

export const adminSidebarItems = [
  { label: "Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Users", icon: PeopleAltRoundedIcon, path: "/admin/users" },
  { label: "Faculties", icon: AccountBalanceRoundedIcon, path: "/admin/faculties" },
  { label: "Divisions", icon: BusinessRoundedIcon, path: "/admin/divisions" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: "/admin/audit-trail" },
];
