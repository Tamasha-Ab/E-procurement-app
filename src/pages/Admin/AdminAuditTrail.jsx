import { useEffect, useMemo, useState } from "react";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import PageHero from "../../components/PageHero";
import PaginationControls, { usePagination } from "../../components/PaginationControls";
import { adminApi } from "../../api/adminApi";
import { formatDateTime } from "../../services/apiClient";

const statusTone = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  PENDING: "bg-amber-50 text-amber-700",
};

const displayName = (user) =>
  [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || user.email || "Unknown user";

const buildEvents = (users) =>
  users.flatMap((user) => {
    const common = {
      userId: user.userId,
      name: displayName(user),
      email: user.email,
      mainRole: user.mainRole,
      subRole: user.subRole,
      status: user.userStatus,
    };

    const events = [
      {
        ...common,
        key: `${user.userId}-created`,
        action: "Registration submitted",
        detail: `${user.mainRole}${user.subRole ? ` / ${user.subRole}` : ""} account created.`,
        at: user.createdAt,
      },
    ];

    if (user.approvedAt) {
      events.push({
        ...common,
        key: `${user.userId}-decision`,
        action: user.userStatus === "REJECTED" ? "Registration rejected" : "Registration approved",
        detail: user.rejectionReason || `Decision recorded by admin ID ${user.approvedBy || "N/A"}.`,
        at: user.approvedAt,
      });
    }

    if (user.updatedAt && user.updatedAt !== user.createdAt && user.updatedAt !== user.approvedAt) {
      events.push({
        ...common,
        key: `${user.userId}-updated`,
        action: user.active ? "User profile updated" : "User deactivated",
        detail: user.active ? "User details or assignments were updated." : "User access was disabled.",
        at: user.updatedAt,
      });
    }

    return events;
  }).sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0));

export default function AdminAuditTrail() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAuditTrail = () => {
    setLoading(true);
    setError("");
    adminApi.users.list({ page: 0, size: 100, sort: "updatedAt,desc" })
      .then((page) => setUsers(page.content || []))
      .catch((err) => setError(err.message || "Could not load admin audit trail."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAuditTrail();
  }, []);

  const events = useMemo(() => {
    const search = filter.trim().toLowerCase();
    const allEvents = buildEvents(users);
    if (!search) return allEvents;
    return allEvents.filter((event) => [
      event.name,
      event.email,
      event.mainRole,
      event.subRole,
      event.status,
      event.action,
      event.detail,
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(search)));
  }, [filter, users]);
  const { page, setPage, totalPages, pageItems, pageSize } = usePagination(events);

  return (
    <div className="space-y-8">
      <PageHero
        eyebrow="Audit Trail"
        title="Admin User Activity"
        description="Review account registration, approval, rejection, and access-state events across the system."
      >
        <div className="rounded-[24px] bg-white/10 p-5 text-right backdrop-blur">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-100">Events</div>
          <div className="mt-2 text-3xl font-black">{events.length}</div>
        </div>
      </PageHero>

      {error ? <div className="rounded-[24px] bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div> : null}

      <section className="rounded-[34px] border border-[#dce8ef] bg-white p-6 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">User Governance</div>
            <h2 className="mt-2 text-2xl font-bold text-[#10283f]">Audit entries</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search audit trail"
              className="rounded-2xl border border-[#dce8ef] px-4 py-2 text-sm outline-none focus:border-[#166e8c]"
            />
            <button
              type="button"
              onClick={loadAuditTrail}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#edf7fb] px-4 py-2 text-sm font-bold text-[#166e8c] hover:bg-[#d9edf5]"
            >
              <RefreshRoundedIcon fontSize="small" />
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {loading && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">Loading audit trail...</div>}
          {!loading && events.length === 0 && <div className="rounded-[24px] bg-slate-50 p-5 text-sm text-slate-600">No audit entries found.</div>}
          {pageItems.map((event) => (
            <div key={event.key} className="rounded-[24px] border border-[#edf3f7] bg-white p-5 shadow-[0_10px_24px_rgba(15,41,64,0.04)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex gap-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]">
                    <HistoryRoundedIcon fontSize="small" />
                  </span>
                  <div>
                    <div className="font-black text-[#10283f]">{event.action}</div>
                    <div className="mt-1 text-sm text-slate-600">{event.name} - {event.email}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-600">{event.detail}</div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${statusTone[event.status] || "bg-slate-100 text-slate-600"}`}>
                    {event.status}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{event.mainRole}</span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{formatDateTime(event.at)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <PaginationControls page={page} setPage={setPage} totalPages={totalPages} totalItems={events.length} pageSize={pageSize} />
      </section>
    </div>
  );
}
