import { useEffect, useMemo, useState } from "react";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import { useNavigate, useParams } from "react-router-dom";
import PageHero from "../../components/PageHero";
import { useAuth } from "../../contexts/AuthContext";
import { apiRequest, formatDateTime, formatMoney, statusLabel } from "../../services/apiClient";
import { procurementApi } from "../../api/procurementApi";
import { getRolePagePath } from "../../utils/roleRoutes";
import { roleScopedNotifications } from "../../utils/notificationRoles";

const NOTIFICATIONS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(0);
  const [search, setSearch] = useState("");
  const [readFilter, setReadFilter] = useState("ALL");
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  const rolePath = (page, fallback) => getRolePagePath(user, page, fallback);
  const unreadCount = notifications.filter((notification) => !notification.read).length;
  const filteredNotifications = useMemo(() => {
    const query = search.trim().toLowerCase();
    return notifications.filter((notification) => {
      if (readFilter === "UNREAD" && notification.read) return false;
      if (readFilter === "READ" && !notification.read) return false;
      if (!query) return true;
      return [notification.title, notification.message, notification.rrNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [notifications, readFilter, search]);
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
        const list = [...roleScopedNotifications(data, user)].sort((left, right) => {
          const rightTime = new Date(right.createdAt || 0).getTime() || 0;
          const leftTime = new Date(left.createdAt || 0).getTime() || 0;
          if (rightTime !== leftTime) return rightTime - leftTime;
          return Number(right.notificationId || 0) - Number(left.notificationId || 0);
        });
        setNotifications(list);
        const routedNotification = notificationId
          ? list.find((item) => String(item.notificationId) === String(notificationId))
          : null;
        if (routedNotification) {
          const routedIndex = list.findIndex((item) => String(item.notificationId) === String(notificationId));
          setCurrentPage(Math.floor(routedIndex / NOTIFICATIONS_PER_PAGE));
        } else {
          setCurrentPage((page) => Math.min(page, Math.max(0, Math.ceil(list.length / NOTIFICATIONS_PER_PAGE) - 1)));
        }
        setSelected((current) => routedNotification || (current ? list.find((item) => item.notificationId === current.notificationId) || null : null));
      })
      .catch((err) => setError(err.message || "Could not load notifications."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (token) loadNotifications();
  }, [token, notificationId, user?.mainRole, user?.subRole]);

  useEffect(() => {
    setCurrentPage(0);
  }, [readFilter, search]);

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

  const toggleSelected = (id) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const markSelectedAsRead = async () => {
    const ids = [...selectedIds].filter((id) => !notifications.find((item) => item.notificationId === id)?.read);
    if (!ids.length) return;
    setIsBulkUpdating(true);
    setError("");
    try {
      const updated = await Promise.all(ids.map((id) => apiRequest(`/api/notifications/${id}/read`, { token, method: "PATCH" })));
      const byId = new Map(updated.map((item) => [item.notificationId, item]));
      setNotifications((current) => current.map((item) => byId.get(item.notificationId) || item));
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (err) {
      setError(err.message || "Could not mark selected notifications as read.");
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const deleteSelected = async () => {
    const ids = [...selectedIds];
    if (!ids.length) return;
    setIsBulkUpdating(true);
    setError("");
    try {
      await Promise.all(ids.map((id) => apiRequest(`/api/notifications/${id}`, { token, method: "DELETE" })));
      setNotifications((current) => current.filter((item) => !selectedIds.has(item.notificationId)));
      setSelectedIds(new Set());
      window.dispatchEvent(new Event("notifications:changed"));
    } catch (err) {
      setError(err.message || "Could not delete selected notifications.");
    } finally {
      setIsBulkUpdating(false);
    }
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
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE));
  const paginatedNotifications = filteredNotifications.slice(
    currentPage * NOTIFICATIONS_PER_PAGE,
    (currentPage + 1) * NOTIFICATIONS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages - 1));
  }, [totalPages]);

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

      <section className="grid items-start gap-6">
        <div className={`${isDetailModalOpen && selected ? "hidden" : "block"} rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Inbox</div>
              <div className="mt-2 text-sm text-slate-600">{unreadCount} new notification{unreadCount === 1 ? "" : "s"}</div>
            </div>
            <button type="button" onClick={loadNotifications} className="rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]">
              Refresh
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-[#e1ebf0] bg-[#f8fbfd] p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search title, message or RR number" className="min-w-0 flex-1 rounded-xl border border-[#dce8ef] bg-white px-3 py-2 text-sm outline-none focus:border-[#166e8c]" />
              <select value={readFilter} onChange={(event) => setReadFilter(event.target.value)} className="rounded-xl border border-[#dce8ef] bg-white px-3 py-2 text-sm font-semibold text-[#315d72] outline-none focus:border-[#166e8c]">
                <option value="ALL">All notifications</option>
                <option value="UNREAD">Unread only</option>
                <option value="READ">Read only</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-[#315d72]">
                <input type="checkbox" checked={paginatedNotifications.length > 0 && paginatedNotifications.every((item) => selectedIds.has(item.notificationId))} onChange={(event) => setSelectedIds((current) => { const next = new Set(current); paginatedNotifications.forEach((item) => event.target.checked ? next.add(item.notificationId) : next.delete(item.notificationId)); return next; })} />
                Select page
              </label>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#166e8c]">{selectedIds.size} selected</span>
              <button type="button" disabled={!selectedIds.size || isBulkUpdating} onClick={markSelectedAsRead} className="rounded-xl bg-[#166e8c] px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Mark as read</button>
              <button type="button" disabled={!selectedIds.size || isBulkUpdating} onClick={deleteSelected} className="rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Delete selected</button>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {isLoading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading notifications...</div>}
            {!isLoading && filteredNotifications.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No matching notifications.</div>}
            {paginatedNotifications.map((notification) => (
              <div key={notification.notificationId} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                  selectedIds.has(notification.notificationId)
                    ? "border-[#166e8c] bg-[#f5fbff]"
                    : notification.read
                      ? "border-[#dce8ef] bg-white hover:bg-[#f8fcff]"
                      : "border-[#f6c453] bg-[#fff8e7] hover:bg-[#fff3cf]"
                }`}>
                <input type="checkbox" checked={selectedIds.has(notification.notificationId)} onChange={() => toggleSelected(notification.notificationId)} aria-label={`Select ${notification.title}`} />
                <button type="button" onClick={() => openNotification(notification)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-3">
                  <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${notification.read ? "bg-[#edf7fb] text-[#166e8c]" : "bg-[#f6c453] text-[#0f2940]"}`}>
                    <NotificationsRoundedIcon sx={{ fontSize: 17 }} />
                  </span>
                  <span className="min-w-0 flex-1 sm:flex sm:items-center sm:gap-3">
                    <span className="flex min-w-0 items-center gap-2 sm:w-52 sm:flex-shrink-0">
                      <span className="truncate text-sm font-bold text-[#10283f]">{notification.title}</span>
                      {!notification.read && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-black leading-none text-white">New</span>}
                    </span>
                    <span className="mt-0.5 line-clamp-1 block min-w-0 flex-1 text-xs text-slate-500 sm:mt-0">{notification.message}</span>
                    <span className="mt-1 block flex-shrink-0 text-[10px] font-semibold text-slate-400 sm:mt-0 sm:text-right">
                      {formatDateTime(notification.createdAt)}
                    </span>
                  </span>
                </div>
                </button>
              </div>
            ))}
          </div>

          {!isLoading && filteredNotifications.length > NOTIFICATIONS_PER_PAGE && (
            <div className="mt-6 flex flex-col gap-3 border-t border-[#e6eef3] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs font-semibold text-slate-500">
                Showing {currentPage * NOTIFICATIONS_PER_PAGE + 1}-{Math.min((currentPage + 1) * NOTIFICATIONS_PER_PAGE, filteredNotifications.length)} of {filteredNotifications.length}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" disabled={currentPage === 0} onClick={() => setCurrentPage((page) => Math.max(0, page - 1))} className="rounded-xl border border-[#dce8ef] px-3 py-2 text-xs font-bold text-[#166e8c] hover:bg-[#edf7fb] disabled:cursor-not-allowed disabled:opacity-40">
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, index) => index).map((page) => (
                  <button key={page} type="button" onClick={() => setCurrentPage(page)} className={`h-9 min-w-9 rounded-xl px-2 text-xs font-black transition ${currentPage === page ? "bg-[#166e8c] text-white" : "border border-[#dce8ef] text-[#166e8c] hover:bg-[#edf7fb]"}`} aria-label={`Open notification page ${page + 1}`}>
                    {page + 1}
                  </button>
                ))}
                <button type="button" disabled={currentPage >= totalPages - 1} onClick={() => setCurrentPage((page) => Math.min(totalPages - 1, page + 1))} className="rounded-xl border border-[#dce8ef] px-3 py-2 text-xs font-bold text-[#166e8c] hover:bg-[#edf7fb] disabled:cursor-not-allowed disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {isDetailModalOpen && selected && (
          <div className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
            <div className="flex items-start gap-4 border-b border-[#e6eef3] pb-5">
              <button
                type="button"
                onClick={closeNotificationDetails}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[#315d72] hover:bg-[#edf7fb] hover:text-[#166e8c]"
                aria-label="Back to notification inbox"
              >
                <ArrowBackRoundedIcon fontSize="small" />
              </button>
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Notification Details</div>
                <h2 className="mt-2 text-2xl font-black text-[#10283f]">{selected.title}</h2>
                <div className="mt-2 text-xs font-semibold text-slate-400">{formatDateTime(selected.createdAt)}</div>
              </div>
            </div>
            {renderNotificationDetails({ showTitle: false, showActions: true })}
          </div>
        )}
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
