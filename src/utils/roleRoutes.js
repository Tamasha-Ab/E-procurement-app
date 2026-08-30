export const SENIOR_ASSISTANT_BURSAR_BASE = "/senior-assistant-bursar";
export const STAFF_MEMBER_BASE = "/staffmember";
export const DIVISION_HEAD_BASE = "/divisionhead";
export const DEAN_BASE = "/dean";

export const isSeniorAssistantBursar = (user) =>
  user?.mainRole === "FINANCE" && user?.subRole === "SENIOR_ASSISTANT_BURSAR";

export const isDivisionHead = (user) =>
  user?.mainRole === "FACULTY_STAFF" && ["DIVISION_HEAD", "HOD"].includes(user?.subRole);

export const isDean = (user) =>
  user?.mainRole === "FACULTY_STAFF" && user?.subRole === "DEAN";

export const isStaffMember = (user) =>
  user?.mainRole === "FACULTY_STAFF" && !isDivisionHead(user) && !isDean(user);

export const getDashboardPath = (user) =>
  isSeniorAssistantBursar(user)
    ? `${SENIOR_ASSISTANT_BURSAR_BASE}/dashboard`
    : isDivisionHead(user)
      ? `${DIVISION_HEAD_BASE}/dashboard`
    : isDean(user)
      ? `${DEAN_BASE}/dashboard`
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

export const getSeniorAssistantBursarPath = (user, page, fallback) =>
  isSeniorAssistantBursar(user) ? seniorAssistantBursarPath(page) : fallback;

export const getUserSettingsPath = (user) =>
  isSeniorAssistantBursar(user)
    ? seniorAssistantBursarPath("settings")
    : isDivisionHead(user)
      ? divisionHeadPath("settings")
      : isDean(user)
        ? deanPath("settings")
      : isStaffMember(user)
      ? staffMemberPath("settings")
      : getDashboardPath(user);

export const getUserNotificationsPath = (user) =>
  isSeniorAssistantBursar(user)
    ? seniorAssistantBursarPath("notifications")
    : isDivisionHead(user)
      ? divisionHeadPath("notifications")
      : isDean(user)
        ? deanPath("notifications")
      : isStaffMember(user)
      ? staffMemberPath("notifications")
      : "/notifications";

export const getRolePagePath = (user, page, fallback) => {
  if (isSeniorAssistantBursar(user)) return seniorAssistantBursarPath(page);
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
