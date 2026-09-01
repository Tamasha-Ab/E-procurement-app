import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";

export const vendorSidebarItems = [
  { label: "Vendor Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "RFQ Invitations", icon: BusinessCenterRoundedIcon, path: "/vendor/rfq-invitations" },
  { label: "Quotation Submission", icon: RequestQuoteRoundedIcon, path: "/vendor/quotation-submission" },
  { label: "Submitted Quotations", icon: ReceiptLongRoundedIcon, path: "/vendor/quotations" },
  { label: "Objections", icon: ReportProblemRoundedIcon, path: "/vendor/objections" },
  { label: "Notification", icon: NotificationsRoundedIcon, path: "/notifications" },
];
