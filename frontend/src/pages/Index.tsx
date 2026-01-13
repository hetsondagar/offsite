import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import EngineerDashboard from "./EngineerDashboard";
import ManagerDashboard from "./ManagerDashboard";

export default function Index() {
  const { role, isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);

  if (isInitialized && (!isAuthenticated || !role)) {
    return <Navigate to="/login" replace />;
  }

  if (!isInitialized || !role || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return role === "engineer" ? <EngineerDashboard /> : <ManagerDashboard />;
}
