const roleGroup = (role) => {
  if (["ADMIN", "SUPER_ADMIN"].includes(role)) return "ADMIN";
  if (["BEC", "BEC_HEAD"].includes(role)) return "BEC";
  if (["DIVISION_HEAD", "HOD"].includes(role)) return "DIVISION_HEAD";
  if (["SENIOR_ASSISTANT_BURSAR", "ASSISTANT_BURSAR", "BURSAR"].includes(role)) return "FINANCE";
  return role;
};

export const notificationMatchesRole = (notification, user) => {
  // Notifications created before role targeting was introduced remain visible,
  // preserving the user's existing inbox history.
  if (!notification?.targetRole) return true;
  return roleGroup(user?.subRole || user?.mainRole) === notification.targetRole;
};

export const roleScopedNotifications = (notifications, user) =>
  (Array.isArray(notifications) ? notifications : []).filter((notification) => notificationMatchesRole(notification, user));
