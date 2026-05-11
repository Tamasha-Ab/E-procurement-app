import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

export const vendorSidebarItems = [
  { label: "Vendor Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Tender Workspace", icon: StorefrontRoundedIcon, path: "/vendor/tenders" },
  { label: "My Submissions", icon: ReceiptLongRoundedIcon, path: "/vendor/submissions" },
  { label: "Purchase Orders", icon: AssignmentTurnedInRoundedIcon, path: "/vendor/purchase-orders" },
];
