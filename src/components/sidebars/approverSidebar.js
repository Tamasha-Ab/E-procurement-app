import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import EngineeringRoundedIcon from "@mui/icons-material/EngineeringRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";

export const hodSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "HOD Approvals", icon: AssignmentTurnedInRoundedIcon, path: "/approvals/hod" },
];

export const deanSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Dean Approvals", icon: RateReviewRoundedIcon, path: "/approvals/dean" },
];

export const tecSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "Technical Reviews", icon: EngineeringRoundedIcon, path: "/approvals/tec" },
  { label: "Tender Evaluation", icon: StorefrontRoundedIcon, path: "/procurement/tenders" },
];

export const vcSidebarItems = [
  { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
  { label: "VC Approvals", icon: RateReviewRoundedIcon, path: "/approvals/vc" },
  { label: "Offer Approvals", icon: StorefrontRoundedIcon, path: "/procurement/tenders" },
];

export const approverSidebarItemsByRole = {
  HOD: hodSidebarItems,
  DEAN: deanSidebarItems,
  TEC: tecSidebarItems,
  VC: vcSidebarItems,
};
