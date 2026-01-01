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
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function FaviconUpdater() {
  useEffect(() => {
    // Function to update favicon based on browser's color scheme preference
    const updateFavicon = () => {
      const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const faviconPath = isDarkMode ? '/logodark.png' : '/logo.png';
      
      // Update the main favicon (id="favicon")
      const favicon = document.getElementById('favicon') as HTMLLinkElement;
      if (favicon) {
        favicon.href = faviconPath;
      }

      // Update all other favicon links (excluding media query ones)
      const faviconLinks = document.querySelectorAll('link[rel="icon"]:not([media])');
      faviconLinks.forEach((link) => {
        const linkElement = link as HTMLLinkElement;
        linkElement.href = faviconPath;
      });

      // Also update apple-touch-icon
      const appleTouchIcon = document.getElementById('apple-touch-icon') as HTMLLinkElement;
      if (appleTouchIcon) {
        appleTouchIcon.href = faviconPath;
      }
    };

    // Initial update
    updateFavicon();

    // Listen for changes in color scheme preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
      updateFavicon();
    };

    // Modern browsers (addEventListener)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers (addListener)
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return null;
}

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
