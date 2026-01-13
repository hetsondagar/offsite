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
import { syncOfflineStores } from "@/lib/offlineSync";
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
import NotFound from "./pages/NotFound";

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
    // Initialize auth from localStorage
    dispatch(initializeAuth());
    
    // Function to check actual connectivity by pinging the API
    const checkConnectivity = async () => {
      try {
        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        // Use health check endpoint that doesn't require authentication
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const response = await fetch(`${apiUrl}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // If we get a successful response, we're online
        if (response.ok) {
          dispatch(setOnlineStatus(true));
        } else {
          // Even if not 200, if we got a response, server is reachable
          dispatch(setOnlineStatus(true));
        }
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string };

        // If fetch fails or times out, we're offline
        if (err?.name === 'AbortError') {
          // Timeout - assume offline
          dispatch(setOnlineStatus(false));
        } else {
          // Network errors mean we're offline
          const message = err?.message || '';
          if (message.includes('Failed to fetch') || message.includes('NetworkError') || err?.name === 'TypeError') {
            dispatch(setOnlineStatus(false));
          } else {
            // Other errors might still mean we're online
            dispatch(setOnlineStatus(true));
          }
        }
      }
    };

    // Set initial online status
    const initialCheck = async () => {
      if (navigator.onLine) {
        // If navigator says online, verify with actual API call
        await checkConnectivity();
      } else {
        // If navigator says offline, trust it
        dispatch(setOnlineStatus(false));
      }
    };
    
    initialCheck();

    // Listen for online/offline events
    const handleOnline = () => {
      dispatch(setOnlineStatus(true));

      // Fire-and-forget: if user is authenticated, sync offline data.
      // This keeps all pages consistent without requiring manual Sync button.
      syncOfflineStores().catch((error) => {
        console.error('Auto-sync failed:', error);
      });
    };
    const handleOffline = () => {
      dispatch(setOnlineStatus(false));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodically check connectivity (every 30 seconds)
    const connectivityInterval = setInterval(() => {
      if (navigator.onLine) {
        checkConnectivity();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(connectivityInterval);
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
