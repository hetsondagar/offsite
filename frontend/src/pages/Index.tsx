import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { initializeAuth } from "@/store/slices/authSlice";
import EngineerDashboard from "./EngineerDashboard";
import ManagerDashboard from "./ManagerDashboard";

export default function Index() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { role, isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth());
    if (!isAuthenticated || !role) {
      navigate("/login");
    }
  }, [dispatch, navigate, isAuthenticated, role]);

  if (!role || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return role === "engineer" ? <EngineerDashboard /> : <ManagerDashboard />;
}
