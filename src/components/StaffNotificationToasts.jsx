import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest, formatDateTime } from "../services/apiClient";
import { isStaffMember, staffMemberPath } from "../utils/roleRoutes";

export default function StaffNotificationToasts() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const shownIds = useRef(new Set());
  const isStaffRole = isStaffMember(user);

  useEffect(() => {
    if (!token || !isStaffRole) return undefined;

    let cancelled = false;

    const markRead = async (notificationId) => {
      try {
        await apiRequest(`/api/notifications/${notificationId}/read`, { token, method: "PATCH" });
        window.dispatchEvent(new Event("notifications:changed"));
      } catch {
        // Notification access should remain available even if the read update fails.
      }
    };

    const openNotification = async (notification) => {
      await markRead(notification.notificationId);
      toast.dismiss(`staff-notification-${notification.notificationId}`);
      navigate(`${staffMemberPath("notifications")}/${notification.notificationId}`);
    };

    const showNotification = (notification) => {
      const toastId = `staff-notification-${notification.notificationId}`;
      if (shownIds.current.has(toastId) || toast.isActive(toastId)) return;

      shownIds.current.add(toastId);
      toast.info(
        <div className="space-y-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#166e8c]">New workspace notification</div>
            <div className="mt-1 text-sm font-black text-[#10283f]">{notification.title}</div>
            <div className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-6 text-slate-600">{notification.message}</div>
            <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              {formatDateTime(notification.createdAt)}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openNotification(notification)}
              className="rounded-xl bg-[#166e8c] px-3 py-2 text-xs font-bold text-white hover:bg-[#145f79]"
            >
              Open notification
            </button>
            <button
              type="button"
              onClick={() => {
                markRead(notification.notificationId);
                toast.dismiss(toastId);
              }}
              className="rounded-xl border border-[#dce8ef] px-3 py-2 text-xs font-bold text-[#10283f] hover:bg-slate-50"
            >
              Mark as read
            </button>
          </div>
        </div>,
        {
          toastId,
          autoClose: false,
          closeOnClick: false,
          onClose: () => markRead(notification.notificationId),
        }
      );
    };

    const loadNotifications = async () => {
      try {
        const data = await apiRequest("/api/notifications/my", { token });
        if (cancelled) return;
        const notifications = Array.isArray(data) ? data : [];
        notifications.filter((notification) => !notification.read).forEach(showNotification);
      } catch {
        // Silent polling failure; the regular notification page remains available.
      }
    };

    loadNotifications();
    const pollTimer = window.setInterval(loadNotifications, 30000);
    window.addEventListener("focus", loadNotifications);

    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.removeEventListener("focus", loadNotifications);
    };
  }, [token, isStaffRole, navigate]);

  return null;
}
