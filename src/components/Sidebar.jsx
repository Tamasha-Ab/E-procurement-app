import { useEffect, useState } from "react";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { getSidebarItems } from "./sidebars/getSidebarItems";
import { apiRequest } from "../services/apiClient";
import { roleScopedNotifications } from "../utils/notificationRoles";

const Sidebar = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = getSidebarItems(user);
  const [unreadCount, setUnreadCount] = useState(0);
  const hasNotifications = items.some((item) => item.path?.endsWith("/notifications"));

  const isActiveItem = (item) => {
    const currentPath = location.pathname;
    if ((item?.excludePaths || []).some((path) => currentPath === path || currentPath.startsWith(`${path}/`))) return false;
    const itemPath = item?.path || "/dashboard";
    if (itemPath === "/dashboard") {
      return currentPath === "/" || currentPath === "/dashboard";
    }
    const paths = [itemPath, ...(item?.activePaths || [])];
    return paths.some((path) => currentPath === path || currentPath.startsWith(`${path}/`));
  };

  const loadUnreadCount = () => {
    if (!token || !hasNotifications) return;
    apiRequest("/api/notifications/my", { token })
      .then((data) => setUnreadCount(roleScopedNotifications(data, user).filter((item) => !item.read).length))
      .catch(() => setUnreadCount(0));
  };

  useEffect(() => {
    loadUnreadCount();
    const refreshTimer = window.setInterval(loadUnreadCount, 30000);
    window.addEventListener("notifications:changed", loadUnreadCount);
    window.addEventListener("focus", loadUnreadCount);
    return () => {
      window.clearInterval(refreshTimer);
      window.removeEventListener("notifications:changed", loadUnreadCount);
      window.removeEventListener("focus", loadUnreadCount);
    };
  }, [token, hasNotifications, user?.mainRole, user?.subRole]);

  return (
    <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] w-[280px] flex-shrink-0 flex-col px-5 py-3 lg:flex xl:w-[290px] xl:px-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#dce8ef] bg-white/92 p-3 shadow-[0_18px_42px_rgba(15,41,64,0.07)]">
        <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActiveItem(item);
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.path || "/dashboard")}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? "border-[#8fc5d8] bg-[#cfeaf4] text-[#0c506b] shadow-[0_5px_14px_rgba(22,110,140,0.12)]"
                    : "border-transparent text-[#10283f] hover:bg-[#f1f7fa]"
                }`}
              >
                <span className={`relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
                  active ? "bg-white text-[#166e8c] shadow-sm" : "bg-[#edf7fb] text-[#166e8c]"
                }`}>
                  <Icon fontSize="small" />
                  {item.path?.endsWith("/notifications") && unreadCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-black leading-none text-white shadow-sm">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </span>
                <span>
                  <span className={`flex items-center gap-2 text-sm font-semibold ${active ? "text-[#0c506b]" : "text-[#10283f]"}`}>
                    {item.label}
                  </span>
                  <span className={`block text-[11px] ${active ? "text-[#3d7185]" : "text-slate-500"}`}>Active workspace</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex-shrink-0 border-t border-[#dce8ef] pt-3">
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/");
            }}
            className="flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-[#10283f] transition hover:border-red-100 hover:bg-red-50 hover:text-red-700"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <LogoutRoundedIcon fontSize="small" />
            </span>
            <span>
              <span className="block text-sm font-semibold">Logout</span>
              <span className="block text-[11px] text-slate-500">End current session</span>
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
