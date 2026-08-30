import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest, formatDateTime } from "../services/apiClient";

const DECISION_TITLES = [
  "vendor registration approved",
  "vendor registration rejected",
  "vendor blacklisted",
];

export default function VendorDecisionPopup() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const shownToastIds = useRef(new Set());
  const isVendor = user?.mainRole === "VENDOR";

  useEffect(() => {
    if (!isVendor || !token) {
      return undefined;
    }

    let cancelled = false;
    const markRead = async (notificationId) => {
      try {
        await apiRequest(`/api/notifications/${notificationId}/read`, {
          token,
          method: "PATCH",
        });
        window.dispatchEvent(new Event("notifications:changed"));
      } catch {
        // A toast should not block the vendor if marking read fails.
      }
    };

    const openNotification = async (notificationId) => {
      await markRead(notificationId);
      toast.dismiss(`vendor-decision-${notificationId}`);
      navigate(`/notifications/${notificationId}`);
    };

    const showToast = (notification) => {
      const toastId = `vendor-decision-${notification.notificationId}`;
      if (shownToastIds.current.has(toastId) || toast.isActive(toastId)) {
        return;
      }

      shownToastIds.current.add(toastId);
      toast.info(
        <div className="space-y-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">DPC Update</div>
            <div className="mt-1 text-sm font-black text-[#10283f]">{notification.title}</div>
            <div className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{notification.message}</div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {formatDateTime(notification.createdAt)}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openNotification(notification.notificationId)}
              className="rounded-xl bg-[#166e8c] px-3 py-2 text-xs font-bold text-white hover:bg-[#145f79]"
            >
              Open
            </button>
            <button
              type="button"
              onClick={() => {
                markRead(notification.notificationId);
                toast.dismiss(toastId);
              }}
              className="rounded-xl border border-[#dce8ef] px-3 py-2 text-xs font-bold text-[#10283f] hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>,
        {
          toastId,
          type: "info",
          autoClose: false,
          closeOnClick: false,
          closeButton: true,
          onClose: () => markRead(notification.notificationId),
        }
      );
    };

    const loadDecisionNotification = () => {
      apiRequest("/api/notifications/my", { token })
        .then((data) => {
          if (cancelled) return;
          const list = Array.isArray(data) ? data : [];
          list
            .filter((item) => {
              const title = item?.title?.toLowerCase() || "";
              return !item?.read && DECISION_TITLES.some((decisionTitle) => title.includes(decisionTitle));
            })
            .forEach(showToast);
        });
    };

    loadDecisionNotification();
    const intervalId = window.setInterval(loadDecisionNotification, 10000);
    window.addEventListener("notifications:changed", loadDecisionNotification);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("notifications:changed", loadDecisionNotification);
    };
  }, [isVendor, token]);

  return null;
}
