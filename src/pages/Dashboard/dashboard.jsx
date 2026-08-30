import { useAuth } from "../../contexts/AuthContext";
import ApproverDashboard from "./ApproverDashboard";
import FinanceDashboard from "./FinanceDashboard";
import StaffDashboard from "./StaffDashboard";
import { approverDashboardConfig } from "./dashboardConfig";

export default function Dashboard() {
  const { user } = useAuth();
  const subRole = user?.subRole;

  if (user?.mainRole === "FINANCE" && user?.subRole === "BEC_HEAD") return <ApproverDashboard />;
  if (user?.mainRole === "FINANCE") return <FinanceDashboard />;
  if (user?.mainRole === "UNIVERSITY_EXECUTIVE") return <ApproverDashboard />;
  if (approverDashboardConfig[subRole]) return <ApproverDashboard />;

  return <StaffDashboard />;
}
