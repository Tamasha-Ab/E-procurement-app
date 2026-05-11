import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";

export const adminSidebarItems = [
  { label: "Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Users", icon: PeopleAltRoundedIcon, path: "/admin/users" },
  { label: "Faculties", icon: AccountBalanceRoundedIcon, path: "/admin/faculties" },
  { label: "Departments", icon: BusinessRoundedIcon, path: "/admin/departments" },
];
