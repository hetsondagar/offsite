import React, { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Provider } from "react-redux";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { store } from "./store/store";
import { useAppDispatch } from "./store/hooks";
import { initializeAuth } from "./store/slices/authSlice";
import { setOnlineStatus } from "./store/slices/offlineSlice";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import DPRPage from "./pages/DPRPage";
import AttendancePage from "./pages/AttendancePage";
import MaterialsPage from "./pages/MaterialsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import InsightsPage from "./pages/InsightsPage";
import ProfilePage from "./pages/ProfilePage";
import SyncPage from "./pages/SyncPage";
import InvoicingPage from "./pages/InvoicingPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    // Initialize auth from localStorage
    dispatch(initializeAuth());
    
    // Set initial online status
    dispatch(setOnlineStatus(navigator.onLine));

    // Listen for online/offline events
    const handleOnline = () => {
      dispatch(setOnlineStatus(true));
    };
    const handleOffline = () => {
      dispatch(setOnlineStatus(false));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/" element={<Index />} />
            <Route path="/dpr" element={<DPRPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/invoicing" element={<InvoicingPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

const App = () => (
  <Provider store={store}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AppContent />
    </ThemeProvider>
  </Provider>
);

export default App;
