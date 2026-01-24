import { Navigate } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import EngineerDashboard from "./EngineerDashboard";
import ManagerDashboard from "./ManagerDashboard";
import PurchaseManagerDashboard from "./PurchaseManagerDashboard";
import ContractorDashboard from "./ContractorDashboard";

export default function Index() {
  const { role, isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);

  if (isInitialized && (!isAuthenticated || !role)) {
    return <Navigate to="/login" replace />;
  }

  if (!isInitialized || !role || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Route to appropriate dashboard based on role
  switch (role) {
    case "engineer":
      return <EngineerDashboard />;
    case "purchase_manager":
      return <PurchaseManagerDashboard />;
    case "contractor":
      return <ContractorDashboard />;
    case "manager":
    case "owner":
    default:
      return <ManagerDashboard />;
  }
}
