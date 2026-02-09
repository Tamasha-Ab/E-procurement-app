import DashboardIcon from "@mui/icons-material/Dashboard";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AssignmentAddIcon from '@mui/icons-material/AssignmentAdd';
import ApprovalIcon from "@mui/icons-material/CheckCircle";
import PaymentsIcon from "@mui/icons-material/Payments";
import StoreIcon from "@mui/icons-material/Store";
import PeopleIcon from "@mui/icons-material/People";
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

import { ROLES } from "../constants/roles";

export const sidebarConfig = {
  [ROLES.ADMIN]: [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Users", icon: <PeopleIcon />, path: "/users" },
    { text: "Requisitions", icon: <AssignmentIcon />, path: "/requisitions" },
  ],

  [ROLES.STAFF]: [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Create Requisition", icon: <AssignmentAddIcon />, path: "/requisition/create" },
    { text: "My Requisitions", icon: <AssignmentIcon />, path: "/requisitions" },
    { text: "My Purchases", icon: <ShoppingBagIcon />, path: "/purchases" },
  ],

  [ROLES.FINANCE]: [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Budget Approvals", icon: <PaymentsIcon />, path: "/finance/approvals" },
  ],

  [ROLES.VENDOR]: [
    { text: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "Advertisements", icon: <StoreIcon />, path: "/ads" },
    { text: "My Bids", icon: <StoreIcon />, path: "/bids" },
  ],
};
