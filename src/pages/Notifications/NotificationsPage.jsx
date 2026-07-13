import { useCallback, useEffect, useState } from "react";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import { useNavigate } from "react-router-dom";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime } from "../../services/apiClient";
import { downloadTenderForm, getTenderFormValue, tenderFormRows } from "../../utils/tenderFormPdf";

const getTenderIdFromNotification = (notification) => {
  if (notification?.tenderId) return notification.tenderId;
  if (!notification?.actionUrl) return null;
  const queryText = notification.actionUrl.includes("?") ? notification.actionUrl.split("?")[1] : "";
  return new URLSearchParams(queryText).get("tenderId");
};

export default function NotificationsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedTender, setSelectedTender] = useState(null);
  const [isTenderLoading, setIsTenderLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const loadNotifications = useCallback(() => {
    setIsLoading(true);
    setError("");
    apiRequest("/api/notifications/my", { token })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        setSelected((current) => current ? list.find((item) => item.notificationId === current.notificationId) || list[0] || null : list[0] || null);
      })
      .catch((err) => setError(err.message || "Could not load notifications."))
      .finally(() => setIsLoading(false));
  }, [token]);

  useEffect(() => {
    if (token) {
      Promise.resolve().then(loadNotifications);
    }
  }, [token, loadNotifications]);

  const openNotification = async (notification) => {
    setSelected(notification);
    if (notification.read) return;

    try {
      const updated = await apiRequest(`/api/notifications/${notification.notificationId}/read`, {
        token,
        method: "PATCH",
      });
      setNotifications((current) => current.map((item) => (
        item.notificationId === notification.notificationId ? updated : item
      )));
      setSelected(updated);
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (err) {
      setError(err.message || "Could not mark notification as read.");
    }
  };

  const scheduleMeetingFromNotification = () => {
    if (selected?.actionUrl) {
      navigate(selected.actionUrl);
    }
  };

  useEffect(() => {
    const tenderId = getTenderIdFromNotification(selected);
    Promise.resolve().then(() => {
      setSelectedTender(null);
      if (!token || !tenderId) return;

      setIsTenderLoading(true);
      apiRequest(`/api/internal/tenders/${tenderId}`, { token })
        .then((data) => setSelectedTender(data))
        .catch((err) => setError(err.message || "Could not load tender details."))
        .finally(() => setIsTenderLoading(false));
    });
  }, [selected, token]);

  const canScheduleMeeting = selected?.actionUrl?.startsWith("/procurement/tenders")
    && selected?.title?.toLowerCase().includes("pre-bid meeting");
  const canSubmitObjection = selected?.actionUrl?.startsWith("/vendor/objections")
    && selected?.title?.toLowerCase().includes("rejected");
  const canViewObjection = selected?.actionUrl?.startsWith("/procurement/tenders")
    && selected?.actionUrl?.includes("section=objections")
    && selected?.title?.toLowerCase().includes("objection");
  const selectedTenderId = getTenderIdFromNotification(selected);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Notification"
        title="Tender Notifications"
        description="Review tender creation notices from the Bursar and related internal procurement updates."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">New</div>
          <div className="mt-2 text-3xl font-black">{unreadCount}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Inbox</div>
              <div className="mt-2 text-sm text-slate-600">{unreadCount} new notification{unreadCount === 1 ? "" : "s"}</div>
            </div>
            <button type="button" onClick={loadNotifications} className="rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
              Refresh
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {isLoading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading notifications...</div>}
            {!isLoading && notifications.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No notifications yet.</div>}
            {notifications.map((notification) => (
              <button
                key={notification.notificationId}
                type="button"
                onClick={() => openNotification(notification)}
                className={`w-full rounded-[24px] border p-5 text-left transition ${
                  selected?.notificationId === notification.notificationId
                    ? "border-[#166e8c] bg-[#f5fbff]"
                    : notification.read
                      ? "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"
                      : "border-[#f6c453] bg-[#fff8e7] hover:bg-[#fff3cf]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <span className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${notification.read ? "bg-[#edf7fb] text-[#166e8c]" : "bg-[#f6c453] text-[#0f2940]"}`}>
                    <NotificationsRoundedIcon fontSize="small" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-black text-[#10283f]">{notification.title}</span>
                      {!notification.read && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-black text-white">New</span>}
                    </span>
                    <span className="mt-2 line-clamp-2 block text-sm leading-6 text-slate-600">{notification.message}</span>
                    <span className="mt-3 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Notification Details</div>
          {!selected ? (
            <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select a notification to view its details.</div>
          ) : (
            <div className="mt-6 space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-black text-[#10283f]">{selected.title}</h2>
                {!selected.read && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">New</span>}
              </div>
              <div className="rounded-[24px] bg-[#f8fcff] p-5 text-sm leading-7 text-slate-600">{selected.message}</div>
              {isTenderLoading && (
                <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading tender details...</div>
              )}
              {selectedTenderId && !isTenderLoading && !selectedTender && (
                <button
                  type="button"
                  onClick={() => {
                    setIsTenderLoading(true);
                    apiRequest(`/api/internal/tenders/${selectedTenderId}`, { token })
                      .then((data) => setSelectedTender(data))
                      .catch((err) => setError(err.message || "Could not load tender details."))
                      .finally(() => setIsTenderLoading(false));
                  }}
                  className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
                >
                  View Tender Form
                </button>
              )}
              {selectedTender && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Tender Form</div>
                      <div className="mt-1 text-lg font-black text-[#10283f]">{selectedTender.tenderNumber}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => downloadTenderForm(selectedTender)}
                      className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
                    >
                      Download PDF
                    </button>
                  </div>
                  <div className="overflow-hidden border border-[#111] bg-white">
                    {tenderFormRows.map((row) => (
                      <div key={row.key} className="grid grid-cols-[42%_58%] border-b border-[#111] last:border-b-0">
                        <div className="border-r border-[#111] bg-[#dbe7f3] px-3 py-3 font-serif text-base font-bold leading-5 text-[#111]">
                          {row.label}
                        </div>
                        <div className="min-h-[42px] bg-white px-3 py-3 text-sm font-semibold leading-6 text-[#111]">
                          {getTenderFormValue(selectedTender, row.key) || "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {canScheduleMeeting && (
                <button
                  type="button"
                  onClick={scheduleMeetingFromNotification}
                  className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
                >
                  Schedule Meeting
                </button>
              )}
              {canSubmitObjection && (
                <button
                  type="button"
                  onClick={scheduleMeetingFromNotification}
                  className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
                >
                  Submit Objections
                </button>
              )}
              {canViewObjection && (
                <button
                  type="button"
                  onClick={scheduleMeetingFromNotification}
                  className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
                >
                  View Details
                </button>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <DetailTile label="Created" value={formatDateTime(selected.createdAt)} />
                <DetailTile label="Read At" value={selected.readAt ? formatDateTime(selected.readAt) : "Unread"} />
                <DetailTile label="RR Number" value={selected.rrNumber || "Not linked"} />
                <DetailTile label="Type" value={selected.notificationType || "IN APP"} />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DetailTile({ label, value }) {
  return (
    <div className="rounded-[20px] bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#166e8c]">{label}</div>
      <div className="mt-2 text-sm font-bold text-[#10283f]">{value || "Not available"}</div>
    </div>
  );
}
