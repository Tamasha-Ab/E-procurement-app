import { useEffect, useState } from "react";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import PendingActionsRoundedIcon from "@mui/icons-material/PendingActionsRounded";
import { adminApi } from "../../api/adminApi";

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
    { label: "Total Users", value: numberValue(stats.totalUsers), icon: PeopleAltRoundedIcon },
    { label: "Pending Approvals", value: numberValue(stats.pendingApprovals), icon: PendingActionsRoundedIcon },
    { label: "Faculties", value: numberValue(faculties.length), icon: AccountBalanceRoundedIcon },
    { label: "Divisions", value: numberValue(divisions.length), icon: BusinessRoundedIcon },
  ];

  return (
    <div className="space-y-7">
      <section className="rounded-[32px] bg-[linear-gradient(135deg,#0f2940,#166e8c)] p-8 text-white shadow-[0_28px_70px_rgba(15,41,64,0.22)]">
        <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">Admin Dashboard</div>
        <div className="mt-4">
          <div>
            <h1 className="text-4xl font-black leading-tight">Control center for users and university structure.</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-100/90">
              Manage account approvals, university faculties, and divisions using the backend admin API.
            </p>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-[28px] border border-[#dce8ef] bg-white p-5 shadow-[0_18px_45px_rgba(15,41,64,0.06)]">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-500">{card.label}</div>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]">
                  <Icon fontSize="small" />
                </span>
              </div>
              <div className="mt-4 text-3xl font-black text-[#10283f]">{loading ? "..." : card.value}</div>
            </div>
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
