import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Basic ProtectedRoute component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/403" replace />;
  return children;
};

export default ProtectedRoute;
