import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import AssignmentTurnedInRoundedIcon from "@mui/icons-material/AssignmentTurnedInRounded";
import AccountBalanceWalletRoundedIcon from "@mui/icons-material/AccountBalanceWalletRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import EngineeringRoundedIcon from "@mui/icons-material/EngineeringRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const getMenuItems = (user) => {
  const mainRole = user?.mainRole;
  const subRole = user?.subRole;

  if (mainRole === "ADMIN") {
    return [
      { label: "Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
      { label: "User Governance", icon: AssignmentTurnedInRoundedIcon, path: "/dashboard" },
      { label: "System Audit", icon: ReceiptLongRoundedIcon, path: "/dashboard" },
    ];
  }

  if (mainRole === "FINANCE") {
    return [
      { label: "Finance Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
      { label: "Budget Control", icon: AccountBalanceWalletRoundedIcon, path: "/dashboard" },
      { label: "Approvals", icon: AssignmentTurnedInRoundedIcon, path: "/dashboard" },
    ];
  }

  if (mainRole === "VENDOR") {
    return [
      { label: "Vendor Dashboard", icon: DashboardRoundedIcon, path: "/dashboard" },
      { label: "Open Opportunities", icon: StorefrontRoundedIcon, path: "/dashboard" },
      { label: "My Submissions", icon: ReceiptLongRoundedIcon, path: "/dashboard" },
    ];
  }

  if (subRole === "HOD") {
    return [
      { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
      { label: "HOD Approvals", icon: AssignmentTurnedInRoundedIcon, path: "/approvals/hod" },
    ];
  }

  if (subRole === "DEAN") {
    return [
      { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
      { label: "Dean Approvals", icon: RateReviewRoundedIcon, path: "/approvals/dean" },
    ];
  }

  if (subRole === "TEC") {
    return [
      { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
      { label: "Technical Reviews", icon: EngineeringRoundedIcon, path: "/approvals/tec" },
    ];
  }

  if (subRole === "VC") {
    return [
      { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
      { label: "VC Approvals", icon: RateReviewRoundedIcon, path: "/approvals/vc" },
    ];
  }

  return [
    { label: "Request Overview", icon: DashboardRoundedIcon, path: "/dashboard" },
    { label: "Create Requisition", icon: AddCircleRoundedIcon, path: "/requisition/create" },
    { label: "My Requisitions", icon: AssignmentTurnedInRoundedIcon, path: "/requisitions" },
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
                onClick={() => navigate(item.path)}
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
