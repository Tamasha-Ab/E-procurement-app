import { Box } from "@mui/material";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardPath, getUserNotificationsPath, getUserSettingsPath } from "../utils/roleRoutes";
import { apiRequest } from "../services/apiClient";

const Header = () => {
  const { user, token, switchRole } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState("");
  const [roleError, setRoleError] = useState("");
  const roleMenuRef = useRef(null);
  const roleName = user?.subRole || user?.mainRole || "User";
  const userName = user?.username || user?.name || user?.email || "User";
  const roleInitial = roleName.charAt(0).toUpperCase();
  const settingsPath = getUserSettingsPath(user);
  const notificationsPath = getUserNotificationsPath(user);
  const assignedRoles = user?.roles?.length
    ? user.roles
    : [{ mainRole: user?.mainRole, subRole: user?.subRole }];
  const hasMultipleRoles = assignedRoles.length > 1;
  const roleKey = (role) => `${role?.mainRole || ""}:${role?.subRole || ""}`;
  const activeRoleKey = roleKey(user);
  const roleLabel = (role) => (role?.subRole || role?.mainRole || "User").replaceAll("_", " ");

  useEffect(() => {
    if (!token) return undefined;
    const loadUnreadCount = () => {
      apiRequest("/api/notifications/my/unread-count", { token })
        .then((data) => setUnreadCount(Number(data?.unreadCount || 0)))
        .catch(() => setUnreadCount(0));
    };
    loadUnreadCount();
    const refreshTimer = window.setInterval(loadUnreadCount, 30000);
    window.addEventListener("notifications:changed", loadUnreadCount);
    window.addEventListener("focus", loadUnreadCount);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("notifications:changed", loadUnreadCount);
      window.removeEventListener("focus", loadUnreadCount);
    };
  }, [token]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target)) setRoleMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const handleRoleSwitch = async (role) => {
    if (roleKey(role) === activeRoleKey) {
      setRoleMenuOpen(false);
      return;
    }
    setSwitchingRole(roleKey(role));
    setRoleError("");
    try {
      const result = await switchRole({ mainRole: role.mainRole, subRole: role.subRole || null });
      setRoleMenuOpen(false);
      navigate(getDashboardPath(result.user), { replace: true });
    } catch (error) {
      setRoleError(error.message || "Could not switch role.");
    } finally {
      setSwitchingRole("");
    }
  };

  return (
    <Box className="fixed inset-x-0 top-0 z-40 bg-[linear-gradient(100deg,rgba(194,225,237,0.97)_0%,rgba(147,201,220,0.97)_52%,rgba(104,172,198,0.97)_100%)] shadow-[0_4px_14px_rgba(15,68,91,0.09)] backdrop-blur-xl">
      <Box className="flex items-center justify-between gap-5 px-4 py-2.5 sm:px-6 md:px-8">
        <Box className="flex items-center gap-4">
          <img
            src="/Images/Logo/Astraea_Logo-removebg-preview.png"
            alt="Astraea Logo"
            className="h-12 w-auto object-contain"
          />
        <Box className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[#166e8c]">
              Astraea
            </div>
            <div className="truncate text-sm font-bold text-[#10283f] sm:text-base">E-Procurement Workspace</div>
          </Box>
        </Box>

        <Box className="flex items-center gap-3 text-xs font-semibold text-[#173c52] lg:gap-6 lg:text-sm">
          <Box className="hidden items-center gap-6 xl:flex">
          <a href="tel:+94912245765" className="flex items-center gap-2 transition hover:text-[#0c607e]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/60 text-[#126b89]">
              <CallOutlinedIcon sx={{ fontSize: 17 }} />
            </span>
            <span><span className="text-[#557486]">Call us:</span> +(94)0 91 2245765/6</span>
          </a>
          <a href="mailto:webmaster@eng.ruh.ac.lk" className="flex items-center gap-2 transition hover:text-[#0c607e]">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white/60 text-[#126b89]">
              <MailOutlineRoundedIcon sx={{ fontSize: 17 }} />
            </span>
            <span><span className="text-[#557486]">E-mail:</span> webmaster@eng.ruh.ac.lk</span>
          </a>
          </Box>

          <button
            type="button"
            onClick={() => navigate(notificationsPath)}
            className="relative grid h-11 w-11 flex-shrink-0 place-items-center rounded-xl border border-white/55 bg-white/45 text-[#135b77] shadow-sm transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#166e8c]/30"
            aria-label="Open notifications"
          >
            <NotificationsNoneRoundedIcon fontSize="small" />
            {unreadCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-black leading-none text-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <div ref={roleMenuRef} className="relative flex rounded-xl border border-white/55 bg-white/45 shadow-sm transition hover:bg-white/60">
            <button
              type="button"
              onClick={() => navigate(settingsPath)}
              className="flex items-center gap-2.5 rounded-l-xl p-1.5 pr-2.5 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#166e8c]/30 sm:pr-3"
              aria-label="Open user settings"
            >
              <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-[#135b77] text-sm font-black text-white shadow-sm">
                {roleInitial}
              </span>
              <span className="hidden min-w-0 sm:block">
                <span className="block max-w-36 truncate text-xs font-bold text-[#10283f]">{userName}</span>
                <span className="block max-w-36 truncate text-[10px] uppercase tracking-[0.11em] text-[#426879]">{roleName.replaceAll("_", " ")}</span>
              </span>
            </button>

            {hasMultipleRoles && (
              <button
                type="button"
                onClick={() => { setRoleMenuOpen((open) => !open); setRoleError(""); }}
                className="grid w-8 place-items-center rounded-r-xl border-l border-white/55 text-[#315d72] hover:bg-white/45 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#166e8c]/30"
                aria-label="Switch user role"
                aria-expanded={roleMenuOpen}
              >
                <ExpandMoreRoundedIcon className={`transition ${roleMenuOpen ? "rotate-180" : ""}`} fontSize="small" />
              </button>
            )}

            {hasMultipleRoles && roleMenuOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-72 overflow-hidden rounded-2xl border border-[#c8dde7] bg-white p-2 shadow-[0_18px_50px_rgba(15,41,64,0.22)]">
                <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-[#668294]">Switch workspace</div>
                {assignedRoles.map((role) => {
                  const key = roleKey(role);
                  const active = key === activeRoleKey;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={Boolean(switchingRole)}
                      onClick={() => handleRoleSwitch(role)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active ? "bg-[#e1f1f7]" : "hover:bg-slate-50"} disabled:opacity-60`}
                    >
                      <span className={`grid h-9 w-9 flex-shrink-0 place-items-center rounded-full text-xs font-black ${active ? "bg-[#135b77] text-white" : "bg-[#edf7fb] text-[#166e8c]"}`}>
                        {roleLabel(role).charAt(0)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold capitalize text-[#10283f]">{roleLabel(role).toLowerCase()}</span>
                        <span className="block truncate text-[10px] uppercase tracking-[0.12em] text-slate-500">{role.mainRole?.replaceAll("_", " ")}</span>
                      </span>
                      {active && <CheckRoundedIcon className="text-[#166e8c]" fontSize="small" />}
                      {switchingRole === key && <span className="text-xs font-semibold text-[#166e8c]">Switching...</span>}
                    </button>
                  );
                })}
                {roleError && <div className="m-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{roleError}</div>}
              </div>
            )}
          </div>
        </Box>
      </Box>
    </Box>
  );
};

export default Header;
