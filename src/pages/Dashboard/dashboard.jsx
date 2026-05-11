import { useAuth } from "../../contexts/AuthContext";
import ApproverDashboard from "./ApproverDashboard";
import FinanceDashboard from "./FinanceDashboard";
import StaffDashboard from "./StaffDashboard";
import { approverDashboardConfig } from "./dashboardConfig";

export default function Dashboard() {
  const { user } = useAuth();
  const subRole = user?.subRole;

  if (user?.mainRole === "FINANCE") return <FinanceDashboard />;
  if (approverDashboardConfig[subRole]) return <ApproverDashboard />;

  return <StaffDashboard />;
}
