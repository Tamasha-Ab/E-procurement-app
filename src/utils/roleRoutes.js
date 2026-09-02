export const SENIOR_ASSISTANT_BURSAR_BASE = "/senior-assistant-bursar";
export const STAFF_MEMBER_BASE = "/staffmember";
export const DIVISION_HEAD_BASE = "/divisionhead";
export const DEAN_BASE = "/dean";
export const BEC_HEAD_BASE = "/bechead";
export const BEC_BASE = "/bec";
export const VC_BASE = "/vc";
export const ADMIN_BASE = "/admin";
export const VENDOR_BASE = "/vendor";
export const DPC_BASE = "/dpc";

export const isSeniorAssistantBursar = (user) =>
  user?.mainRole === "FINANCE" && user?.subRole === "SENIOR_ASSISTANT_BURSAR";

export const isDivisionHead = (user) =>
  user?.mainRole === "FACULTY_STAFF" && ["DIVISION_HEAD", "HOD"].includes(user?.subRole);

export const isDean = (user) =>
  user?.mainRole === "FACULTY_STAFF" && user?.subRole === "DEAN";

export const isBecHead = (user) =>
  user?.mainRole === "FINANCE" && user?.subRole === "BEC_HEAD";

export const isBec = (user) =>
  user?.mainRole === "FINANCE" && user?.subRole === "BEC";

export const isVc = (user) =>
  user?.mainRole === "UNIVERSITY_EXECUTIVE" && user?.subRole === "VC";

export const isAdmin = (user) =>
  user?.mainRole === "ADMIN" || user?.mainRole === "SUPER_ADMIN";

export const isVendor = (user) => user?.mainRole === "VENDOR";
export const isDpc = (user) => user?.mainRole === "DPC";

export const isStaffMember = (user) =>
  user?.mainRole === "FACULTY_STAFF" && !isDivisionHead(user) && !isDean(user);

export const getDashboardPath = (user) =>
  isDpc(user)
    ? `${DPC_BASE}/dashboard`
    : isAdmin(user)
    ? `${ADMIN_BASE}/dashboard`
    : isSeniorAssistantBursar(user)
    ? `${SENIOR_ASSISTANT_BURSAR_BASE}/dashboard`
    : isBecHead(user)
      ? `${BEC_HEAD_BASE}/dashboard`
    : isBec(user)
      ? `${BEC_BASE}/dashboard`
    : isVc(user)
      ? `${VC_BASE}/dashboard`
    : isDivisionHead(user)
      ? `${DIVISION_HEAD_BASE}/dashboard`
    : isDean(user)
      ? `${DEAN_BASE}/dashboard`
    : isVendor(user)
      ? `${VENDOR_BASE}/dashboard`
    : isStaffMember(user)
      ? `${STAFF_MEMBER_BASE}/dashboard`
    : "/dashboard";

export const seniorAssistantBursarPath = (page = "") =>
  `${SENIOR_ASSISTANT_BURSAR_BASE}${page ? `/${page}` : ""}`;

export const staffMemberPath = (page = "") =>
  `${STAFF_MEMBER_BASE}${page ? `/${page}` : ""}`;

export const divisionHeadPath = (page = "") =>
  `${DIVISION_HEAD_BASE}${page ? `/${page}` : ""}`;

export const deanPath = (page = "") =>
  `${DEAN_BASE}${page ? `/${page}` : ""}`;

export const becHeadPath = (page = "") =>
  `${BEC_HEAD_BASE}${page ? `/${page}` : ""}`;

export const becPath = (page = "") =>
  `${BEC_BASE}${page ? `/${page}` : ""}`;

export const vcPath = (page = "") =>
  `${VC_BASE}${page ? `/${page}` : ""}`;

export const adminPath = (page = "") =>
  `${ADMIN_BASE}${page ? `/${page}` : ""}`;

export const vendorPath = (page = "") =>
  `${VENDOR_BASE}${page ? `/${page}` : ""}`;

export const dpcPath = (page = "") =>
  `${DPC_BASE}${page ? `/${page}` : ""}`;

export const getSeniorAssistantBursarPath = (user, page, fallback) =>
  isSeniorAssistantBursar(user) ? seniorAssistantBursarPath(page) : fallback;

export const getUserSettingsPath = (user) =>
  isDpc(user)
    ? dpcPath("settings")
    : isAdmin(user)
    ? adminPath("settings")
    : isVendor(user)
      ? vendorPath("settings")
    : isSeniorAssistantBursar(user)
    ? seniorAssistantBursarPath("settings")
    : isBecHead(user)
      ? becHeadPath("settings")
    : isBec(user)
      ? becPath("settings")
    : isVc(user)
      ? vcPath("settings")
    : isDivisionHead(user)
      ? divisionHeadPath("settings")
      : isDean(user)
        ? deanPath("settings")
      : isStaffMember(user)
      ? staffMemberPath("settings")
      : getDashboardPath(user);

export const getUserNotificationsPath = (user) =>
  isDpc(user)
    ? dpcPath("notifications")
    : isAdmin(user)
    ? adminPath("notifications")
    : isVendor(user)
      ? vendorPath("notifications")
    : isSeniorAssistantBursar(user)
    ? seniorAssistantBursarPath("notifications")
    : isBecHead(user)
      ? becHeadPath("notifications")
    : isBec(user)
      ? becPath("notifications")
    : isVc(user)
      ? vcPath("notifications")
    : isDivisionHead(user)
      ? divisionHeadPath("notifications")
      : isDean(user)
        ? deanPath("notifications")
      : isStaffMember(user)
      ? staffMemberPath("notifications")
      : "/notifications";

export const getRolePagePath = (user, page, fallback) => {
  if (isDpc(user)) return dpcPath(page);
  if (isAdmin(user)) return adminPath(page);
  if (isVendor(user)) return vendorPath(page);
  if (isSeniorAssistantBursar(user)) return seniorAssistantBursarPath(page);
  if (isBecHead(user)) return becHeadPath(page);
  if (isBec(user)) return becPath(page);
  if (isVc(user)) return vcPath(page);
  if (isDivisionHead(user)) {
    const divisionPages = { notifications: "notifications", "tender-records": "tenders", settings: "settings" };
    return divisionHeadPath(divisionPages[page] || page);
  }
  if (isDean(user)) {
    const deanPages = { notifications: "notifications", "tender-records": "tenders", settings: "settings" };
    return deanPath(deanPages[page] || page);
  }
  if (isStaffMember(user)) {
    const staffPages = { notifications: "notifications", "tender-records": "tenders", settings: "settings" };
    return staffMemberPath(staffPages[page] || page);
  }
  return fallback;
};
