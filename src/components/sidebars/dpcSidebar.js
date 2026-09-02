import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import StoreRoundedIcon from "@mui/icons-material/StoreRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import BlockRoundedIcon from "@mui/icons-material/BlockRounded";
import GavelRoundedIcon from "@mui/icons-material/GavelRounded";
import { dpcPath } from "../../utils/roleRoutes";

export const dpcSidebarItems = [
  { label: "Overview", icon: DashboardRoundedIcon, path: dpcPath("dashboard") },
  { label: "Tenders", icon: StoreRoundedIcon, path: dpcPath("tenders") },
  { label: "Vendors", icon: StoreRoundedIcon, path: dpcPath("vendors"), excludePaths: [dpcPath("vendors/blacklist")] },
  { label: "Quotation Approval", icon: GavelRoundedIcon, path: dpcPath("quotation-approvals") },
  { label: "Notifications", icon: NotificationsRoundedIcon, path: dpcPath("notifications") },
  { label: "Audit Trail", icon: HistoryRoundedIcon, path: dpcPath("audit-trail") },
  { label: "Black List Vendors", icon: BlockRoundedIcon, path: dpcPath("vendors/blacklist") },
];
