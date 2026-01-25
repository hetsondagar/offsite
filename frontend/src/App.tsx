import React, { useEffect, useState } from "react";
import { ThemeProvider, useTheme } from "next-themes";
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
import { getNetworkStatus, addNetworkListener } from "@/lib/network";
import { scheduleSync } from "@/lib/syncEngine";
import { initAppLifecycle } from "@/lib/appLifecycle";
import { preloadFaceModels } from "@/lib/face-recognition";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DPRPage from "./pages/DPRPage";
import AttendancePage from "./pages/AttendancePage";
import MaterialsPage from "./pages/MaterialsPage";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ApprovalsPage from "./pages/ApprovalsPage";
import InsightsPage from "./pages/InsightsPage";
import ProfilePage from "./pages/ProfilePage";
import SyncPage from "./pages/SyncPage";
import InvoicingPage from "./pages/InvoicingPage";
import EventsPage from "./pages/EventsPage";
import AICommandCenter from "./pages/AICommandCenter";
import TasksPage from "./pages/TasksPage";
import AllDPRsPage from "./pages/AllDPRsPage";
import PendingApprovalsDetailPage from "./pages/PendingApprovalsDetailPage";
import AttendanceDetailPage from "./pages/AttendanceDetailPage";
import DPRDetailPage from "./pages/DPRDetailPage";
import NotFound from "./pages/NotFound";
// New module pages
import PurchaseDashboard from "./pages/PurchaseDashboard";
import PurchaseHistoryPage from "./pages/PurchaseHistoryPage";
import PurchaseInvoicesPage from "./pages/PurchaseInvoicesPage";
import ContractorLaboursPage from "./pages/ContractorLaboursPage";
import ContractorAttendancePage from "./pages/ContractorAttendancePage";
import ContractorWeeklyInvoicePage from "./pages/ContractorWeeklyInvoicePage";
import ContractorsManagementPage from "./pages/ContractorsManagementPage";
import ToolsPage from "./pages/ToolsPage";
import PermitsPage from "./pages/PermitsPage";
import PettyCashPage from "./pages/PettyCashPage";
import EngineerSite360UploadPage from "./pages/EngineerSite360UploadPage";
import OwnerSite360WalkthroughPage from "./pages/OwnerSite360WalkthroughPage";
import Site360ProjectsPage from "./pages/Site360ProjectsPage";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";

const queryClient = new QueryClient();

function FaviconUpdater() {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Determine the actual theme being used
    // If theme is 'system', use systemTheme; otherwise use theme directly
    const actualTheme = theme === 'system' && systemTheme ? systemTheme : theme;
    const isDarkMode = actualTheme === 'dark';
    // Use SVG favicon for better visibility at small sizes
    const faviconPath = isDarkMode ? '/favicon-dark.svg' : '/favicon.svg';
    const logoPath = isDarkMode ? '/logodark.png' : '/logo.png';
    
    // Update the main favicon (id="favicon") - SVG for better scaling
    // Force browser to reload by removing and re-adding the element
    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    if (favicon) {
      const newHref = `${faviconPath}?v=${isDarkMode ? 'dark' : 'light'}`;
      // Remove old favicon
      favicon.remove();
      // Create new favicon element
      const newFavicon = document.createElement('link');
      newFavicon.id = 'favicon';
      newFavicon.rel = 'icon';
      newFavicon.type = 'image/svg+xml';
      newFavicon.href = newHref;
      document.head.appendChild(newFavicon);
    }

    // Update SVG favicon links (excluding media query ones)
    const svgFaviconLinks = document.querySelectorAll('link[rel="icon"][type="image/svg+xml"]:not([media])');
    svgFaviconLinks.forEach((link) => {
      const linkElement = link as HTMLLinkElement;
      if (linkElement.id !== 'favicon') {
        linkElement.href = `${faviconPath}?v=${isDarkMode ? 'dark' : 'light'}`;
      }
    });

    // Update PNG favicon links for fallback
    const pngFaviconLinks = document.querySelectorAll('link[rel="icon"][type="image/png"]:not([media])');
    pngFaviconLinks.forEach((link) => {
      const linkElement = link as HTMLLinkElement;
      linkElement.href = `${logoPath}?v=${isDarkMode ? 'dark' : 'light'}`;
    });

    // Also update apple-touch-icon (use PNG for better quality)
    const appleTouchIcon = document.getElementById('apple-touch-icon') as HTMLLinkElement;
    if (appleTouchIcon) {
      appleTouchIcon.href = `${logoPath}?v=${isDarkMode ? 'dark' : 'light'}`;
    }

    // Update shortcut icon fallback (use SVG)
    const shortcutIcon = document.querySelector('link[rel="shortcut icon"]') as HTMLLinkElement;
    if (shortcutIcon) {
      shortcutIcon.href = `${faviconPath}?v=${isDarkMode ? 'dark' : 'light'}`;
    }
  }, [theme, systemTheme, mounted]);

  return null;
}

function AppContent() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    dispatch(initializeAuth());

    const applyOnline = (online: boolean) => {
      dispatch(setOnlineStatus(online));
    };

    const initialCheck = async () => {
      const status = await getNetworkStatus();
      applyOnline(status.online);
    };

    initialCheck();

    const removeNetworkListener = addNetworkListener((online) => {
      applyOnline(online);
      if (online) scheduleSync();
    });

    const interval = setInterval(initialCheck, 30000);
    const cleanupLifecycle = initAppLifecycle();

    // Preload face recognition models in background
    preloadFaceModels().catch(err => {
      console.warn('Face models preload failed, will retry on first use:', err);
    });

    return () => {
      removeNetworkListener();
      clearInterval(interval);
      cleanupLifecycle();
    };
  }, [dispatch]);

  return (
    <div className="w-full min-h-screen overflow-x-hidden max-w-full" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <FaviconUpdater />
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_relativeSplatPath: true }}>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/" element={<Index />} />
            <Route path="/dpr" element={<DPRPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/materials" element={<MaterialsPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route path="/approvals" element={<ApprovalsPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/invoicing" element={<InvoicingPage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/ai-command" element={<AICommandCenter />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/all-dprs" element={<AllDPRsPage />} />
            <Route path="/pending-approvals" element={<PendingApprovalsDetailPage />} />
            <Route path="/attendance-details" element={<AttendanceDetailPage />} />
            <Route path="/dpr/:id" element={<DPRDetailPage />} />
            {/* Purchase Manager Routes */}
            <Route path="/purchase-dashboard" element={<PurchaseDashboard />} />
            <Route path="/purchase-history" element={<PurchaseHistoryPage />} />
            {/* Purchase Invoices (Manager/Owner) */}
            <Route path="/purchase-invoices" element={<PurchaseInvoicesPage />} />
            {/* Contractor Routes */}
            <Route path="/contractor/labours" element={<ContractorLaboursPage />} />
            <Route path="/contractor/attendance" element={<ContractorAttendancePage />} />
            <Route path="/contractor/weekly-invoice" element={<ContractorWeeklyInvoicePage />} />
            {/* Owner Routes */}
            <Route
              path="/contractors"
              element={
                <ProtectedRoute requiredPermission="canViewContractors">
                  <ContractorsManagementPage />
                </ProtectedRoute>
              }
            />
            {/* Shared Routes */}
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/permits" element={<PermitsPage />} />
            <Route path="/petty-cash" element={<PettyCashPage />} />
            {/* Site360 Routes */}
            <Route
              path="/site360"
              element={
                <ProtectedRoute requiredPermission="canViewSite360">
                  <Site360ProjectsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/site360/upload"
              element={
                <ProtectedRoute requiredPermission="canUploadSite360">
                  <EngineerSite360UploadPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/site360/:projectId"
              element={
                <ProtectedRoute requiredPermission="canViewSite360">
                  <OwnerSite360WalkthroughPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
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
