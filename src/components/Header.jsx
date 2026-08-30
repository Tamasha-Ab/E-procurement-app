import { Box } from "@mui/material";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import MailOutlineRoundedIcon from "@mui/icons-material/MailOutlineRounded";
import NotificationsNoneRoundedIcon from "@mui/icons-material/NotificationsNoneRounded";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getDashboardPath, getSeniorAssistantBursarPath } from "../utils/roleRoutes";
import { apiRequest } from "../services/apiClient";

const Header = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const roleName = user?.subRole || user?.mainRole || "User";
  const userName = user?.username || user?.name || user?.email || "User";
  const roleInitial = roleName.charAt(0).toUpperCase();
  const settingsPath = getSeniorAssistantBursarPath(user, "settings", getDashboardPath(user));
  const notificationsPath = getSeniorAssistantBursarPath(user, "notifications", "/notifications");

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

          <button
            type="button"
            onClick={() => navigate(settingsPath)}
            className="flex items-center gap-2.5 rounded-xl border border-white/55 bg-white/45 p-1.5 pr-2.5 text-left shadow-sm transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-[#166e8c]/30 sm:pr-3"
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
        </Box>
      </Box>
    </Box>
  );
};

export default Header;
