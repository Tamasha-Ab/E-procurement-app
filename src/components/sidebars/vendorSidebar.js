import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import BusinessCenterRoundedIcon from "@mui/icons-material/BusinessCenterRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import RequestQuoteRoundedIcon from "@mui/icons-material/RequestQuoteRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import { vendorPath } from "../../utils/roleRoutes";

export const vendorSidebarItems = [
  { label: "Vendor Dashboard", icon: DashboardRoundedIcon, path: vendorPath("dashboard") },
  { label: "RFQ Invitations", icon: BusinessCenterRoundedIcon, path: vendorPath("rfq-invitations") },
  { label: "Quotation Submission", icon: RequestQuoteRoundedIcon, path: vendorPath("quotation-submission") },
  { label: "Submitted Quotations", icon: ReceiptLongRoundedIcon, path: vendorPath("quotations") },
  { label: "Received Offer Letters", icon: LocalOfferRoundedIcon, path: vendorPath("offer-letters") },
  { label: "Objections", icon: ReportProblemRoundedIcon, path: vendorPath("objections") },
  { label: "Notification", icon: NotificationsRoundedIcon, path: vendorPath("notifications") },
  { label: "Settings", icon: SettingsRoundedIcon, path: vendorPath("settings") },
];
