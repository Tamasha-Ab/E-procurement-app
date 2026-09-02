import { useEffect, useState } from "react";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import { useNavigate } from "react-router-dom";
import { adminApi } from "../../api/adminApi";
import PageHero from "../../components/PageHero";

const emptyStats = {
  totalUsers: 0,
  activeUsers: 0,
  pendingApprovals: 0,
  approvedUsers: 0,
};

const numberValue = (value) => Number(value || 0).toLocaleString();

const normalizeStats = (stats, pendingPage) => ({
  ...emptyStats,
  ...stats,
  pendingApprovals:
    stats?.pendingApprovals ??
    stats?.pendingUsers ??
    pendingPage?.totalElements ??
    pendingPage?.content?.length ??
    0,
});

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(emptyStats);
  const [faculties, setFaculties] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError("");

      try {
        const [userStats, facultyList, divisionList, pendingPage] = await Promise.all([
          adminApi.users.statistics().catch(() => emptyStats),
          adminApi.faculties.all().catch(() => []),
          adminApi.divisions.all().catch(() => []),
          adminApi.users.pending().catch(() => ({ content: [] })),
        ]);

        if (!mounted) return;

        setStats(normalizeStats(userStats, pendingPage));
        setFaculties(Array.isArray(facultyList) ? facultyList : []);
        setDivisions(Array.isArray(divisionList) ? divisionList : []);
        setPendingUsers(pendingPage.content || []);
      } catch (loadError) {
        if (mounted) setError(loadError.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const cards = [
    { label: "Total Users", value: numberValue(stats.totalUsers), icon: PeopleAltRoundedIcon, path: "/admin/users" },
    { label: "Pending Approvals", value: numberValue(stats.pendingApprovals), icon: PendingActionsRoundedIcon, path: "/admin/users?status=PENDING" },
    { label: "Faculties", value: numberValue(faculties.length), icon: AccountBalanceRoundedIcon, path: "/admin/faculties" },
    { label: "Divisions", value: numberValue(divisions.length), icon: BusinessRoundedIcon, path: "/admin/divisions" },
  ];

  return (
    <div className="space-y-7">
      <PageHero
        eyebrow="Admin Dashboard"
        title="Control center for users and university structure"
        description="Manage account approvals, university faculties, and divisions using the backend admin API."
      />

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => navigate(card.path)}
              className="rounded-[28px] border border-[#dce8ef] bg-white p-5 text-left shadow-[0_18px_45px_rgba(15,41,64,0.06)] transition hover:-translate-y-0.5 hover:border-[#166e8c] hover:shadow-[0_24px_55px_rgba(15,41,64,0.1)]"
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-500">{card.label}</div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]">
                  <Icon fontSize="small" />
                </span>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="text-3xl font-black text-[#10283f]">{loading ? "..." : card.value}</div>
                <ArrowForwardRoundedIcon className="text-[#166e8c]" fontSize="small" />
              </div>
            </button>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Structure Overview</div>
          <h2 className="mt-2 text-2xl font-bold text-[#10283f]">University administration</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[24px] bg-[#f5fbff] p-5">
              <div className="text-sm font-semibold text-[#166e8c]">Active Faculties</div>
              <div className="mt-3 text-2xl font-black text-[#10283f]">{faculties.filter((item) => item.active).length}</div>
            </div>
            <div className="rounded-[24px] bg-[#fff9ec] p-5">
              <div className="text-sm font-semibold text-[#b47a00]">Active Divisions</div>
              <div className="mt-3 text-2xl font-black text-[#10283f]">{divisions.filter((item) => item.active).length}</div>
            </div>
            <div className="rounded-[24px] bg-slate-50 p-5">
              <div className="text-sm font-semibold text-slate-600">Approved Users</div>
              <div className="mt-3 text-2xl font-black text-[#10283f]">{numberValue(stats.approvedUsers)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-[30px] border border-[#dce8ef] bg-white p-6 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[#166e8c]">Waiting Approval</div>
          <h2 className="mt-2 text-2xl font-bold text-[#10283f]">Pending users</h2>
          <div className="mt-5 space-y-3">
            {pendingUsers.length ? (
              pendingUsers.map((user) => (
                <div key={user.userId} className="rounded-[22px] bg-slate-50 p-4">
                  <div className="font-semibold text-[#10283f]">{user.firstName || user.username} {user.lastName || ""}</div>
                  <div className="mt-1 text-sm text-slate-600">{user.email}</div>
                  <div className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#166e8c]">{user.mainRole}</div>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] bg-slate-50 p-4 text-sm text-slate-600">No pending users found.</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
