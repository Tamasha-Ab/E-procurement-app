import { adminSidebarItems } from "./adminSidebar";
import { approverSidebarItemsByRole } from "./approverSidebar";
import { becHeadSidebarItems, becSidebarItems, bursarSidebarItems, financeSidebarItems, procurementOfficerSidebarItems } from "./financeSidebar";
import { dpcSidebarItems } from "./dpcSidebar";
import { staffSidebarItems } from "./staffSidebar";
import { vendorSidebarItems } from "./vendorSidebar";

const bursarSubRoles = ["BURSAR", "ASSISTANT_BURSAR", "SENIOR_ASSISTANT_BURSAR"];

export const getSidebarItems = (user) => {
  const mainRole = user?.mainRole;
  const subRole = user?.subRole;

  if (mainRole === "ADMIN") return adminSidebarItems;
  if (mainRole === "DPC") return dpcSidebarItems;
  if (mainRole === "VENDOR") return vendorSidebarItems;
  if (mainRole === "UNIVERSITY_EXECUTIVE") return approverSidebarItemsByRole[subRole] || staffSidebarItems;

  if (mainRole === "FINANCE") {
    if (bursarSubRoles.includes(subRole)) return bursarSidebarItems;
    if (subRole === "BEC_HEAD") return becHeadSidebarItems;
    if (subRole === "BEC") return becSidebarItems;
    if (subRole === "PROCUREMENT_OFFICER") return procurementOfficerSidebarItems;
    return financeSidebarItems;
  }

  return approverSidebarItemsByRole[subRole] || staffSidebarItems;
};
