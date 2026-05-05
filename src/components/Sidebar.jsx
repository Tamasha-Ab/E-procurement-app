import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const getMenuItems = (user) => {
  const mainRole = user?.mainRole;
  const subRole = user?.subRole;

  if (mainRole === "ADMIN") {
    return [
      { label: "Overview", icon: DashboardRoundedIcon },
      { label: "User Governance", icon: AssignmentTurnedInRoundedIcon },
      { label: "System Audit", icon: ReceiptLongRoundedIcon },
    ];
  }

  if (mainRole === "FINANCE") {
    return [
      { label: "Finance Dashboard", icon: DashboardRoundedIcon },
      { label: "Budget Control", icon: AccountBalanceWalletRoundedIcon },
      { label: "Approvals", icon: AssignmentTurnedInRoundedIcon },
    ];
  }

  if (mainRole === "VENDOR") {
    return [
      { label: "Vendor Dashboard", icon: DashboardRoundedIcon },
      { label: "Open Opportunities", icon: StorefrontRoundedIcon },
      { label: "My Submissions", icon: ReceiptLongRoundedIcon },
    ];
  }

  return [
    { label: "Request Overview", icon: DashboardRoundedIcon },
    { label: subRole === "TEC" ? "Technical Reviews" : "My Requisitions", icon: AssignmentTurnedInRoundedIcon },
    { label: "Workflow Trail", icon: ReceiptLongRoundedIcon },
  ];
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayRole = user?.subRole || user?.mainRole || "USER";
  const items = getMenuItems(user);

  return (
    <aside className="sticky top-[84px] hidden h-[calc(100vh-100px)] w-[290px] flex-col justify-between px-6 py-6 xl:flex">
      <div className="rounded-[28px] border border-[#dce8ef] bg-white/92 p-5 shadow-[0_24px_55px_rgba(15,41,64,0.08)]">
        <div className="rounded-[24px] bg-[linear-gradient(145deg,#0f2940,#166e8c)] p-5 text-white">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-100">Current Role</div>
          <div className="mt-3 text-2xl font-bold">{displayRole}</div>
          <div className="mt-2 text-sm leading-7 text-slate-200">
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
                onClick={() => navigate("/dashboard")}
                className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:bg-[#eef5f8]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf7fb] text-[#166e8c]">
                  <Icon fontSize="small" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-[#10283f]">{item.label}</span>
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
        className="mt-5 flex items-center gap-3 rounded-[24px] border border-[#dce8ef] bg-white px-5 py-4 font-semibold text-[#10283f] shadow-[0_14px_35px_rgba(15,41,64,0.08)] transition hover:border-[#166e8c] hover:text-[#166e8c]"
      >
        <LogoutRoundedIcon fontSize="small" />
        Logout
      </button>
    </aside>
  );
};

export default Sidebar;
