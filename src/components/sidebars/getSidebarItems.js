import { adminSidebarItems } from "./adminSidebar";
import { approverSidebarItemsByRole } from "./approverSidebar";
import { bursarSidebarItems, financeSidebarItems, procurementOfficerSidebarItems } from "./financeSidebar";
import { staffSidebarItems } from "./staffSidebar";
import { vendorSidebarItems } from "./vendorSidebar";

export const getSidebarItems = (user) => {
  const mainRole = user?.mainRole;
  const subRole = user?.subRole;

  if (mainRole === "ADMIN") return adminSidebarItems;
  if (mainRole === "VENDOR") return vendorSidebarItems;

  if (mainRole === "FINANCE") {
    if (subRole === "BURSAR") return bursarSidebarItems;
    if (subRole === "PROCUREMENT_OFFICER") return procurementOfficerSidebarItems;
    return financeSidebarItems;
  }

  return approverSidebarItemsByRole[subRole] || staffSidebarItems;
};
