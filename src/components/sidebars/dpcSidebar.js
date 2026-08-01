import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";

export const dpcSidebarItems = [
  { label: "Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Tenders", icon: StoreRoundedIcon, path: "/tenders" },
  { label: "Vendors", icon: StoreRoundedIcon, path: "/dpc/vendors" },
  { label: "Notifications", icon: NotificationsRoundedIcon, path: "/notifications" },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: "/dpc/audit-trail" },
  { label: "Black List Vendors", icon: BlockRoundedIcon, path: "/dpc/vendors/blacklist" },
];
