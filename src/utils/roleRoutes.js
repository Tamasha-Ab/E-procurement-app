export const SENIOR_ASSISTANT_BURSAR_BASE = "/senior-assistant-bursar";

export const isSeniorAssistantBursar = (user) =>
  user?.mainRole === "FINANCE" && user?.subRole === "SENIOR_ASSISTANT_BURSAR";

export const getDashboardPath = (user) =>
  isSeniorAssistantBursar(user)
    ? `${SENIOR_ASSISTANT_BURSAR_BASE}/dashboard`
    : "/dashboard";

export const seniorAssistantBursarPath = (page = "") =>
  `${SENIOR_ASSISTANT_BURSAR_BASE}${page ? `/${page}` : ""}`;

export const getSeniorAssistantBursarPath = (user, page, fallback) =>
  isSeniorAssistantBursar(user) ? seniorAssistantBursarPath(page) : fallback;
