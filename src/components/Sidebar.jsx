import { useEffect, useState } from "react";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getSidebarItems } from "./sidebars/getSidebarItems";
import { apiRequest } from "../services/apiClient";

const Sidebar = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const displayRole = user?.subRole || user?.mainRole || "USER";
  const items = getSidebarItems(user);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = () => {
    if (!token || !items.some((item) => item.path === "/notifications")) return;
    apiRequest("/api/notifications/my/unread-count", { token })
      .then((data) => setUnreadCount(Number(data?.unreadCount || 0)))
      .catch(() => setUnreadCount(0));
  };

  useEffect(() => {
    loadUnreadCount();
    window.addEventListener("notifications:changed", loadUnreadCount);
    return () => window.removeEventListener("notifications:changed", loadUnreadCount);
  }, [token, items]);

  return (
    <aside className="sticky top-[84px] hidden h-[calc(100vh-84px)] w-[280px] flex-shrink-0 flex-col gap-4 px-5 py-4 lg:flex xl:w-[290px] xl:px-6">
      <div className="min-h-0 flex-1 overflow-y-auto rounded-[28px] border border-[#dce8ef] bg-white/92 p-4 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
        <div className="rounded-[22px] bg-[linear-gradient(145deg,#0f2940,#166e8c)] p-4 text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">Current Role</div>
          <div className="mt-3 text-2xl font-bold">{displayRole}</div>
          <div className="mt-2 text-xs leading-6 text-slate-200">
            Streamline approvals, reviews, and accountability across the university procurement chain.
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => navigate(item.path || "/dashboard")}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-[#eef5f8]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]">
                  <Icon fontSize="small" />
                </span>
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold text-[#10283f]">
                    {item.label}
                    {item.path === "/notifications" && unreadCount > 0 && (
                      <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">{unreadCount}</span>
                    )}
                  </span>
                  <span className="block text-xs text-slate-500">Active workspace</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          logout();
          navigate("/");
        }}
        className="flex flex-shrink-0 items-center gap-3 rounded-[24px] border border-[#dce8ef] bg-white px-5 py-4 font-semibold text-[#10283f] shadow-[0_14px_35px_rgba(15,41,64,0.08)] transition hover:border-[#166e8c] hover:text-[#166e8c]"
      >
        <LogoutRoundedIcon fontSize="small" />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
