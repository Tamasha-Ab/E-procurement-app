import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

export const vendorSidebarItems = [
  { label: "Vendor Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
  { label: "Tender Workspace", icon: StorefrontRoundedIcon, path: "/vendor/tenders" },
  { label: "Submitted Quotations", icon: ReceiptLongRoundedIcon, path: "/vendor/quotations" },
  { label: "Objections", icon: ReportProblemRoundedIcon, path: "/vendor/objections" },
];
