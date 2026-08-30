import { useEffect, useMemo, useState } from "react";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useNavigate, useParams } from "react-router-dom";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import { procurementApi } from "../../api/procurementApi";
import { getRolePagePath } from "../../utils/roleRoutes";

export default function NotificationsPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const { notificationId } = useParams();
  const [notifications, setNotifications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedTender, setSelectedTender] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const isVendor = user?.mainRole === "VENDOR";
  const rolePath = (page, fallback) => getRolePagePath(user, page, fallback);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const selectedTenderId = useMemo(() => {
    const match = selected?.actionUrl?.match(/^\/tenders\/(\d+)/);
    return match ? match[1] : null;
  }, [selected?.actionUrl]);
  const selectedTenderNumber = useMemo(() => {
    const match = selected?.message?.match(/Tender\s+([^\s]+)\s+-/i);
    return match ? match[1] : null;
  }, [selected?.message]);
  const tenderDetailId = selectedTenderId || selectedTender?.tenderId;
  const selectedVendorRfqId = useMemo(() => {
    const match = selected?.actionUrl?.match(/^\/vendor\/rfqs\/(\d+)\/document/);
    return match ? match[1] : null;
  }, [selected?.actionUrl]);
  const isBecCategoryListNotification = selected?.rrId
    && selected?.title?.toLowerCase().includes("bec category list submitted");

  const loadNotifications = () => {
    setIsLoading(true);
    setError("");
    apiRequest("/api/notifications/my", { token })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setNotifications(list);
        const routedNotification = notificationId
          ? list.find((item) => String(item.notificationId) === String(notificationId))
          : null;
        setSelected((current) => routedNotification || (current ? list.find((item) => item.notificationId === current.notificationId) || null : null));
      })
      .catch((err) => setError(err.message || "Could not load notifications."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (token) loadNotifications();
  }, [token, notificationId]);

  useEffect(() => {
    if (!notificationId || notifications.length === 0) return;
    const routedNotification = notifications.find((item) => String(item.notificationId) === String(notificationId));
    if (routedNotification) openNotification(routedNotification, { skipNavigate: true });
  }, [notificationId, notifications]);

  const openNotification = async (notification, options = {}) => {
    if (!options.skipNavigate) {
      navigate(`${rolePath("notifications", "/notifications")}/${notification.notificationId}`);
    }
    setSelected(notification);
    setIsDetailModalOpen(true);
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
      setIsDetailModalOpen(true);
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (err) {
      setError(err.message || "Could not mark notification as read.");
    }
  };

  const closeNotificationDetails = () => {
    setIsDetailModalOpen(false);
    setSelected(null);
    navigate(rolePath("notifications", "/notifications"), { replace: true });
  };

  const scheduleMeetingFromNotification = () => {
    if (isBecCategoryListNotification) {
      navigate(`${rolePath("received-rr", "/finance/category-rr")}/${selected.rrId}`);
      return;
    }
    if (selectedVendorRfqId) {
      navigate(`/vendor/rfq-invitations?rfqId=${selectedVendorRfqId}`);
      return;
    }
    if (selected?.actionUrl) {
      navigate(selected.actionUrl);
    }
  };

  useEffect(() => {
    setSelectedTender(null);
    if (!token || (!selectedTenderId && !selectedTenderNumber)) return;

    const request = selectedTenderId
      ? procurementApi.tenders.detail(token, selectedTenderId)
      : procurementApi.tenders.list(token).then((data) => {
        const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
        return list.find((tender) => tender.tenderNumber === selectedTenderNumber) || null;
      });

    request
      .then(setSelectedTender)
      .catch(() => setSelectedTender(null));
  }, [token, selectedTenderId, selectedTenderNumber]);

  const canScheduleMeeting = selected?.actionUrl?.startsWith("/procurement/tenders")
    && selected?.title?.toLowerCase().includes("pre-bid meeting");
  const canSubmitObjection = selected?.actionUrl?.startsWith("/vendor/objections")
    && selected?.title?.toLowerCase().includes("rejected");
  const canViewObjection = selected?.actionUrl?.startsWith("/procurement/tenders")
    && selected?.actionUrl?.includes("section=objections")
    && selected?.title?.toLowerCase().includes("objection");
  const isRoleRequestApproved = selected?.title?.toLowerCase().includes("role request approved");
  const isNewRequisitionSubmitted = selected?.title?.toLowerCase().includes("new requisition submitted");
  const notificationRrId = selected?.rrId || selected?.actionUrl?.match(/(\d+)(?:\D*)$/)?.[1];
  const canOpenAction = selected?.actionUrl
    && !tenderDetailId
    && !canScheduleMeeting
    && !canSubmitObjection
    && !canViewObjection
    && !isRoleRequestApproved
    && !isNewRequisitionSubmitted;

  const renderNotificationDetails = ({ showTitle = true, showActions = true } = {}) => (
    !selected ? (
      <div className="mt-6 rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Select a notification to view its details.</div>
    ) : (
      <div className="mt-6 space-y-5">
        {showTitle && (
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-black text-[#10283f]">{selected.title}</h2>
          {!selected.read && <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-black text-white">New</span>}
        </div>
        )}
        <div className="rounded-[24px] bg-[#f8fcff] p-5 text-sm leading-7 text-slate-600 whitespace-pre-line">{selected.message}</div>
        {showActions && isNewRequisitionSubmitted && notificationRrId && (
          <button
            type="button"
            onClick={() => navigate(`${rolePath("approvals", "/approvals/hod")}/${notificationRrId}`)}
            className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
          >
            View Details
          </button>
        )}
        {showActions && tenderDetailId && (
          <button
            type="button"
            onClick={() => navigate(`${rolePath("tender-records", "/tenders")}/${tenderDetailId}`)}
            className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
          >
            View Full Details
          </button>
        )}
        {showActions && canScheduleMeeting && (
          <button
            type="button"
            onClick={scheduleMeetingFromNotification}
            className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
          >
            Schedule Meeting
          </button>
        )}
        {showActions && canSubmitObjection && (
          <button
            type="button"
            onClick={scheduleMeetingFromNotification}
            className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
          >
            Submit Objections
          </button>
        )}
        {showActions && canViewObjection && (
          <button
            type="button"
            onClick={scheduleMeetingFromNotification}
            className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
          >
            View Details
          </button>
        )}
        {showActions && canOpenAction && (
          <button
            type="button"
            onClick={scheduleMeetingFromNotification}
            className="rounded-2xl bg-[#166e8c] px-5 py-3 text-sm font-bold text-white hover:bg-[#145f79]"
          >
            {selectedVendorRfqId ? "View" : isBecCategoryListNotification ? "View RR Details" : "Open"}
          </button>
        )}
        {(selectedTenderId || selectedTenderNumber) && (
          <div className="rounded-[24px] border border-[#dce8ef] bg-[#f8fcff] p-5">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#166e8c]">Tender Summary</div>
            {selectedTender ? (
              <div className="mt-4 space-y-4">
                <div>
                  <div className="text-xl font-black text-[#10283f]">{selectedTender.tenderNumber} - {selectedTender.title}</div>
                  <div className="mt-2 text-sm leading-7 text-slate-600">
                    {selectedTender.tenderType || "Tender type not set"} | {selectedTender.procurementMethod || "Method not set"} | {formatMoney(selectedTender.tenderValue)}
                  </div>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <DetailTile label="Funding Source" value={selectedTender.fundingSource || "Not set"} />
                  <DetailTile label="Closing Date" value={selectedTender.closingDateTime ? formatDateTime(selectedTender.closingDateTime) : "Not set"} />
                  <DetailTile label="Status" value={statusLabel(selectedTender.status)} />
                  <DetailTile label="Created By" value={selectedTender.createdByName || "Not recorded"} />
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-slate-600">Loading tender summary...</div>
            )}
          </div>
        )}
      </div>
    )
  );

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Notification"
        title="Tender Notifications"
        description="Review tender creation notices from the Bursar and related internal procurement updates."
      >
        <div className="rounded-xl bg-white/10 px-4 py-2.5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">New</div>
          <div className="mt-0.5 text-xl font-black">{unreadCount}</div>
        </div>
      </PageHero>

      {error && <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}

      <section className={`grid items-start gap-6 ${!isVendor && isDetailModalOpen && selected ? "xl:grid-cols-[0.9fr_1.1fr]" : ""}`}>
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

        {!isVendor && isDetailModalOpen && selected && (
          <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Notification Details</div>
                <h2 className="mt-2 text-2xl font-black text-[#10283f]">{selected.title}</h2>
              </div>
              <button
                type="button"
                onClick={closeNotificationDetails}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close notification details"
              >
                <CloseRoundedIcon fontSize="small" />
              </button>
            </div>
            {renderNotificationDetails({ showTitle: false, showActions: true })}
          </div>
        )}
      </section>

      {isVendor && isDetailModalOpen && selected && (
        <div className="fixed inset-0 z-[1250] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.35)]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Notification Details</div>
                <h2 className="mt-2 text-2xl font-black text-[#10283f]">{selected.title}</h2>
              </div>
              <button
                type="button"
                onClick={closeNotificationDetails}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close notification details"
              >
                <CloseRoundedIcon fontSize="small" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-104px)] overflow-y-auto p-6">
              {renderNotificationDetails({ showTitle: false, showActions: true })}
            </div>
          </div>
        </div>
      )}
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
