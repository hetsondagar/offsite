import { InvoiceCard } from "@/components/invoicing/InvoiceCard";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/common/KPICard";
import { HealthScoreRing } from "@/components/common/HealthScoreRing";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store/hooks";
import { 
  FolderKanban, 
  Users, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  ChevronRight,
  Building2,
  FileText,
  Image as ImageIcon,
  Camera
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { projectsApi } from "@/services/api/projects";
import { insightsApi } from "@/services/api/insights";
import { materialsApi } from "@/services/api/materials";
import { attendanceApi } from "@/services/api/attendance";
import { notificationsApi } from "@/services/api/notifications";
import { dprApi } from "@/services/api/dpr";
import { invoicesApi, type Invoice } from "@/services/api/invoices";
import { contractorApi, Contractor } from "@/services/api/contractor";
import { pettyCashApi, type PettyCash } from "@/services/api/petty-cash";
import { purchaseInvoiceApi, PurchaseInvoice } from "@/services/api/purchase";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, X, Star, Building, Receipt, Download, Check, XCircle } from "lucide-react";
import { jsPDF } from 'jspdf';
import { ContractorInvoice } from "@/services/api/contractor";
import { toast } from "sonner";
import { NotificationBell } from "@/components/common/NotificationBell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { UnauthorizedError } from "@/lib/api";
import { motion } from "framer-motion";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { role } = useAppSelector((state) => state.auth);
  const { t } = useTranslation();
  const isFetchingRef = useRef(false);
  const hasLoadedOnceRef = useRef(false);
  const [projectOverview, setProjectOverview] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState(0);
  const [healthScores, setHealthScores] = useState<Array<{ projectId: string; projectName: string; healthScore: number }>>([]);
  const [kpis, setKpis] = useState({
    activeProjects: 0,
    attendance: 0,
    attendanceTrend: 0, // Percentage change vs average
    pendingApprovals: 0,
    delayRisks: 0,
  });
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [aiInsight, setAiInsight] = useState<{ text: string; projectName: string; projectId: string } | null>(null);
  const [recentDPRs, setRecentDPRs] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PettyCash[]>([]);
  const [pendingContractorInvoices, setPendingContractorInvoices] = useState<ContractorInvoice[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDPR, setSelectedDPR] = useState<any | null>(null);
  const [isDPRModalOpen, setIsDPRModalOpen] = useState(false);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);
  const [approvingInvoiceId, setApprovingInvoiceId] = useState<string | null>(null);
  const [downloadingPurchaseInvoiceId, setDownloadingPurchaseInvoiceId] = useState<string | null>(null);
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleDownloadContractorInvoicePDF = async (invoice: ContractorInvoice) => {
    try {
      setDownloadingInvoiceId(invoice._id);
      const doc = new jsPDF();
      
      // Title
      doc.setFontSize(18);
      doc.text('CONTRACTOR INVOICE', 105, 20, { align: 'center' });
      
      // Invoice Details
      doc.setFontSize(10);
      doc.text(`Invoice No: ${invoice.invoiceNumber || 'N/A'}`, 14, 35);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`, 14, 42);
      
      // Project Details
      doc.text(`Project: ${invoice.projectId?.name || 'N/A'}`, 14, 52);
      doc.text(`Location: ${invoice.projectId?.location || 'N/A'}`, 14, 59);
      
      // Week Period
      const weekStart = new Date(invoice.weekStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const weekEnd = new Date(invoice.weekEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      doc.text(`Period: ${weekStart} - ${weekEnd}`, 14, 69);
      
      // Contractor Details
      const contractorName = invoice.contractorId?.userId?.name || 'N/A';
      const contractorId = invoice.contractorId?.userId?.offsiteId || 'N/A';
      doc.setFontSize(12);
      doc.text('Contractor Details:', 14, 82);
      doc.setFontSize(10);
      doc.text(`Name: ${contractorName}`, 14, 90);
      doc.text(`ID: ${contractorId}`, 14, 97);
      
      // Invoice Items Table
      let yPos = 110;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', 14, yPos);
      doc.text('Quantity', 100, yPos);
      doc.text('Rate (₹)', 140, yPos);
      doc.text('Amount (₹)', 180, yPos, { align: 'right' });
      
      yPos += 8;
      doc.line(14, yPos, 200, yPos);
      yPos += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.text('Labour Days', 14, yPos);
      doc.text(`${invoice.labourCountTotal} days`, 100, yPos);
      doc.text(`${invoice.ratePerLabour.toFixed(2)}`, 140, yPos);
      doc.text(`${invoice.taxableAmount.toFixed(2)}`, 180, yPos, { align: 'right' });
      
      yPos += 10;
      doc.line(14, yPos, 200, yPos);
      yPos += 8;
      
      // Taxable Amount
      doc.text('Taxable Amount:', 14, yPos);
      doc.text(`₹${invoice.taxableAmount.toFixed(2)}`, 180, yPos, { align: 'right' });
      
      yPos += 8;
      // GST
      doc.text(`GST (${invoice.gstRate}%):`, 14, yPos);
      doc.text(`₹${invoice.gstAmount.toFixed(2)}`, 180, yPos, { align: 'right' });
      
      yPos += 10;
      doc.line(14, yPos, 200, yPos);
      yPos += 8;
      
      // Total
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('Total Amount:', 14, yPos);
      doc.text(`₹${invoice.totalAmount.toFixed(2)}`, 180, yPos, { align: 'right' });
      
      // Status
      yPos += 15;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Status: ${invoice.status.replace(/_/g, ' ')}`, 14, yPos);
      
      // Save PDF
      const filename = `Contractor-Invoice-${invoice.invoiceNumber || invoice._id.slice(-6)}.pdf`;
      doc.save(filename);
      toast.success('Invoice PDF downloaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate PDF');
    } finally {
      setDownloadingInvoiceId(null);
    }
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      setApprovingInvoiceId(invoiceId);
      await contractorApi.approveInvoice(invoiceId);
      toast.success('Invoice approved successfully');
      loadDashboardData({ silent: true }); // Refresh data without full-screen loading
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve invoice');
    } finally {
      setApprovingInvoiceId(null);
    }
  };

  const handleDownloadPurchaseInvoicePdf = async (invoiceId: string) => {
    try {
      setDownloadingPurchaseInvoiceId(invoiceId);
      const blob = await purchaseInvoiceApi.downloadPDF(invoiceId);
      const invoice = purchaseInvoices.find((inv) => inv._id === invoiceId);
      const filename = invoice?.invoiceNumber
        ? `Purchase-Invoice-${invoice.invoiceNumber}.pdf`
        : `Purchase-Invoice-${invoiceId}.pdf`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Purchase invoice PDF downloaded successfully');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to download invoice');
    } finally {
      setDownloadingPurchaseInvoiceId(null);
    }
  };

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds to get latest data (including new DPRs)
    const refreshInterval = setInterval(() => {
      // Avoid re-mount flicker: refresh silently and skip if a fetch is already running.
      loadDashboardData({ silent: true });
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const loadDashboardData = async (options?: { silent?: boolean }) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    try {
      const silent = options?.silent ?? false;
      if (!silent && !hasLoadedOnceRef.current) {
        setIsLoading(true);
      }
      
      // Batch all API calls in parallel for better performance
      const loadPromises: Promise<any>[] = [
        projectsApi.getAll(1, 10).catch(err => {
          console.error('Error loading projects:', err);
          return { projects: [] };
        }),
        insightsApi.getSiteHealth().catch(err => {
          console.error('Error loading site health:', err);
          return { overallHealthScore: 0, projectHealthScores: [] };
        }),
        insightsApi.getDelayRisks().catch(err => {
          console.error('Error loading delay risks:', err);
          return [];
        }),
        materialsApi.getPending(1, 100).catch(err => {
          console.error('Error loading materials:', err);
          return { requests: [] };
        }),
      ];

      // Load role-specific data in parallel
      if (role === 'manager') {
        loadPromises.push(
          pettyCashApi.getPendingExpenses().catch(() => []),
          contractorApi.getPendingInvoices().catch(() => []),
          purchaseInvoiceApi.getInvoices(1, 10).catch(() => ({ invoices: [] }))
        );
      }
      
      if (role === 'owner') {
        loadPromises.push(
          purchaseInvoiceApi.getInvoices(1, 10).catch(() => ({ invoices: [] }))
        );
      }
      
      if (role === 'owner' || role === 'manager') {
        loadPromises.push(
          contractorApi.getContractors().catch(() => [])
        );
      }
      
      // Wait for all promises with proper error handling
      const results = await Promise.all(loadPromises);
      
      // Destructure results based on role
      let projectsData, healthData, delayRisksData, materialsData, contractorsData, pendingExpensesData, pendingInvoicesData, purchaseInvoicesData;
      
      if (role === 'manager') {
        [projectsData, healthData, delayRisksData, materialsData, contractorsData, pendingExpensesData, pendingInvoicesData, purchaseInvoicesData] = results;
      } else if (role === 'owner') {
        [projectsData, healthData, delayRisksData, materialsData, purchaseInvoicesData, contractorsData] = results;
        pendingExpensesData = [];
        pendingInvoicesData = [];
      } else {
        [projectsData, healthData, delayRisksData, materialsData, contractorsData] = results;
        pendingExpensesData = [];
        pendingInvoicesData = [];
        purchaseInvoicesData = { invoices: [] };
      }

      if (role === 'manager') {
        setPendingExpenses(Array.isArray(pendingExpensesData) ? pendingExpensesData : []);
        setPendingContractorInvoices(Array.isArray(pendingInvoicesData) ? pendingInvoicesData : []);
        setPurchaseInvoices(Array.isArray(purchaseInvoicesData?.invoices) ? purchaseInvoicesData.invoices : []);
      } else if (role === 'owner') {
        setPendingExpenses([]);
        setPendingContractorInvoices([]);
        setPurchaseInvoices(Array.isArray(purchaseInvoicesData?.invoices) ? purchaseInvoicesData.invoices : []);
      } else {
        setPendingExpenses([]);
        setPendingContractorInvoices([]);
        setPurchaseInvoices([]);
      }

      setProjectOverview(Array.isArray(projectsData?.projects) ? projectsData.projects : []);
      setHealthScore(healthData?.overallHealthScore || 0);
      setHealthScores(Array.isArray(healthData?.projectHealthScores) ? healthData.projectHealthScores : []);
      
      if ((role === 'owner' || role === 'manager') && contractorsData) {
        setContractors(Array.isArray(contractorsData) ? contractorsData : []);
      } else {
        setContractors([]);
      }
      
      
      // Calculate attendance percentage from real data (optimized)
      let attendancePercentage = 0;
      let attendanceTrend = 0;
      try {
        const projects = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
        if (projects.length > 0) {
          // Optimize: Only calculate for first 3 projects to improve performance
          const projectsToCheck = Array.isArray(projects) ? projects.slice(0, 3) : [];
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          // Load attendance in parallel for better performance
          const attendancePromises = projectsToCheck.map(async (project: any) => {
            try {
              const attData = await attendanceApi.getByProject(project._id, 1, 50).catch(() => ({ attendance: [] }));
              
              // Today's attendance
              const todayAtt = attData?.attendance?.filter((att: any) => {
                const attDate = new Date(att.timestamp);
                attDate.setHours(0, 0, 0, 0);
                return attDate.getTime() === today.getTime() && att.type === 'checkin';
              }) || [];
              const uniqueUsersToday = new Set(todayAtt.map((att: any) => {
                const userId = typeof att.userId === 'object' ? att.userId._id : att.userId;
                return userId?.toString() || '';
              }).filter(Boolean));
              
              // Last 7 days attendance (excluding today) for average
              const pastWeekAtt = attData?.attendance?.filter((att: any) => {
                const attDate = new Date(att.timestamp);
                attDate.setHours(0, 0, 0, 0);
                return attDate >= sevenDaysAgo && attDate < today && att.type === 'checkin';
              }) || [];
              
              // Group by day and count unique users per day
              const dayMap = new Map<string, Set<string>>();
              pastWeekAtt.forEach((att: any) => {
                const dateKey = att.timestamp.split('T')[0];
                if (!dayMap.has(dateKey)) {
                  dayMap.set(dateKey, new Set());
                }
                const userId = typeof att.userId === 'object' ? att.userId._id : att.userId;
                if (userId) {
                  dayMap.get(dateKey)!.add(userId.toString());
                }
              });
              
              const dailyCounts = Array.from(dayMap.values()).map(users => users.size);
              const avgPastWeek = dailyCounts.length > 0
                ? dailyCounts.reduce((sum, count) => sum + count, 0) / dailyCounts.length
                : 0;
              
              return {
                today: uniqueUsersToday.size,
                avgPastWeek: avgPastWeek,
              };
            } catch {
              return { today: 0, avgPastWeek: 0 };
            }
          });
          
          const attendanceData = await Promise.all(attendancePromises);
          const totalCheckedInToday = attendanceData.reduce((sum, data) => sum + data.today, 0);
          const totalAvgPastWeek = attendanceData.reduce((sum, data) => sum + data.avgPastWeek, 0);
          
          // Calculate actual team size from project members (engineers only)
          // Use already loaded project data instead of making more API calls
          let totalEngineers = 0;
          for (const project of projectsToCheck) {
            if (project.members && Array.isArray(project.members)) {
              const engineerCount = project.members.filter((member: any) => {
                const memberRole = typeof member === 'object' ? member.role : null;
                return memberRole === 'engineer';
              }).length;
              totalEngineers += engineerCount;
            }
          }
          
          // If no engineers found in members, estimate from project count
          if (totalEngineers === 0 && projects.length > 0) {
            // Estimate: assume at least 1 engineer per project
            totalEngineers = projectsToCheck.length;
          }
          
          attendancePercentage = totalEngineers > 0 ? Math.round((totalCheckedInToday / totalEngineers) * 100) : 0;
          
          // Calculate trend vs average
          if (totalAvgPastWeek > 0 && totalEngineers > 0) {
            const avgPastWeekPercent = Math.round((totalAvgPastWeek / totalEngineers) * 100);
            attendanceTrend = attendancePercentage - avgPastWeekPercent;
          } else if (totalAvgPastWeek === 0 && attendancePercentage > 0) {
            attendanceTrend = attendancePercentage;
          }
        }
      } catch (error) {
        console.error('Error calculating attendance:', error);
      }
      
      // Calculate KPIs with proper data
      const activeProjectsCount = projectsData?.projects?.filter((p: any) => p.status === 'active').length || projectsData?.projects?.length || 0;
      const pendingMaterialsCount = materialsData?.requests?.filter((r: any) => r.status === 'pending').length || 0;
      const pendingExpensesCount = role === 'manager' ? (Array.isArray(pendingExpensesData) ? pendingExpensesData.length : 0) : 0;
      const pendingContractorInvoicesCount = role === 'manager' ? (Array.isArray(pendingInvoicesData) ? pendingInvoicesData.length : 0) : 0;
      const delayRisksArray = Array.isArray(delayRisksData) ? delayRisksData : [];
      const highRiskProjects = delayRisksArray.filter((r: any) => (r.riskLevel === 'high' || r.risk === 'High')).length || 0;

      setKpis({
        activeProjects: activeProjectsCount,
        attendance: Math.max(0, Math.min(100, attendancePercentage)), // Clamp between 0-100
        attendanceTrend: attendanceTrend,
        pendingApprovals: pendingMaterialsCount + pendingExpensesCount + pendingContractorInvoicesCount,
        delayRisks: highRiskProjects,
      });

      // Load recent DPRs from all projects in parallel (optimized)
      try {
        const projects = Array.isArray(projectsData?.projects) ? projectsData.projects : [];
        if (Array.isArray(projects) && projects.length > 0) {
          // Load DPRs for first 3 projects in parallel (reduced from 5 for performance)
          const projectsToLoad = projects.slice(0, 3);
          const dprPromises = projectsToLoad.map((project: any) =>
            dprApi.getByProject(project._id, 1, 5)
              .then((dprData: any) => ({
                projectName: project.name,
                projectId: project._id,
                dprs: dprData?.dprs || [],
              }))
              .catch(() => ({
                projectName: project.name,
                projectId: project._id,
                dprs: [],
              }))
          );
          
          const dprResults = await Promise.all(dprPromises);
          const allDPRs = Array.isArray(dprResults) 
            ? dprResults.flatMap((result: any) => {
                const dprs = Array.isArray(result?.dprs) ? result.dprs : [];
                return dprs.map((dpr: any) => ({
                  ...dpr,
                  projectName: result.projectName,
                  projectId: result.projectId,
                }));
              })
            : [];
          
          // Sort by creation date (newest first) and take top 10
          if (Array.isArray(allDPRs)) {
            allDPRs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setRecentDPRs(allDPRs.slice(0, 10));
          } else {
            setRecentDPRs([]);
          }
        } else {
          setRecentDPRs([]);
        }
      } catch (error) {
        console.error('Error loading DPRs:', error);
        setRecentDPRs([]);
      }

      // Load AI insight for highest risk project (optimized - only if needed)
      // Skip AI calls for performance - use structured data instead
      try {
        const delayRisksArray = Array.isArray(delayRisksData) ? delayRisksData : [];
        const highRiskProjects = delayRisksArray.filter((r: any) => 
          (r.riskLevel === 'high' || r.risk === 'High' || r.riskLevel === 'medium' || r.risk === 'Medium')
        );
        if (highRiskProjects.length > 0) {
          const topRiskProject = highRiskProjects[0];
          // Use structured data instead of AI call for better performance
          if (topRiskProject.cause || topRiskProject.factors) {
            const cause = topRiskProject.cause || topRiskProject.factors?.[0] || 'Project delay risk detected';
            const impact = topRiskProject.impact || 'Monitor closely';
            setAiInsight({
              text: `${cause}. Impact: ${impact}`,
              projectName: topRiskProject.projectName || 'Project',
              projectId: topRiskProject.projectId,
            });
          }
        } else if (projectsData?.projects?.length > 0) {
          // Use health score for insight if no risks
          const firstProject = projectsData.projects[0];
          const projectHealth = healthScores.find(h => h.projectId === firstProject._id);
          if (projectHealth) {
            const status = projectHealth.healthScore >= 70 ? 'Good' : projectHealth.healthScore >= 50 ? 'Fair' : 'Needs Attention';
            setAiInsight({
              text: `Health status: ${status}. Score: ${projectHealth.healthScore}%`,
              projectName: firstProject.name,
              projectId: firstProject._id,
            });
          }
        }
      } catch (error) {
        console.error('Error loading AI insights:', error);
      }

      // Load recent invoices (only for non-owner roles, skip for performance)
      if (role !== 'owner') {
        try {
          const invoicesData = await invoicesApi.getAll(1, 10).catch(() => ({ invoices: [] }));
          const allInvoices = Array.isArray(invoicesData?.invoices) ? invoicesData.invoices : [];
          // Filter invoices created by owner
          const ownerInvoices = Array.isArray(allInvoices) 
            ? allInvoices.filter((inv: Invoice) => {
                const ownerData = typeof inv.ownerId === 'object' ? inv.ownerId : null;
                return ownerData !== null;
              })
            : [];
          // Sort by createdAt descending and take first 5
          if (Array.isArray(ownerInvoices)) {
            ownerInvoices.sort((a: Invoice, b: Invoice) => 
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setRecentInvoices(ownerInvoices.slice(0, 5));
          } else {
            setRecentInvoices([]);
          }
        } catch (error) {
          console.error('Error loading invoices:', error);
          setRecentInvoices([]);
        }
      } else {
        setRecentInvoices([]);
      }

      // Load pending project invitations (only if authenticated)
      try {
        const token = localStorage.getItem('accessToken');
        if (token) {
          const invitationsData = await notificationsApi.getMyInvitations();
          console.log('Loaded invitations:', invitationsData);
          setPendingInvitations(Array.isArray(invitationsData) ? invitationsData : []);
        } else {
          setPendingInvitations([]);
        }
      } catch (error: any) {
        // Silently handle 401 errors (user not authenticated)
        if (error instanceof UnauthorizedError || error?.message?.includes('Unauthorized') || error?.message?.includes('No token')) {
          setPendingInvitations([]);
        } else {
          console.error('Error loading invitations:', error);
          setPendingInvitations([]);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      if (!hasLoadedOnceRef.current) {
        hasLoadedOnceRef.current = true;
        setIsLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.acceptInvitation(invitationId);
      toast.success(t('projects.projectInvitationAccepted'));
      // Reload dashboard data
      loadDashboardData({ silent: true });
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.rejectInvitation(invitationId);
      toast.success(t('projects.invitationRejected'));
      // Reload dashboard data
      loadDashboardData({ silent: true });
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      toast.error(error.message || 'Failed to reject invitation');
    }
  };

  return (
    <MobileLayout role={role || "manager"}>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 safe-area-top w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 opacity-0 animate-fade-up">
          {/* Centered Large Logo */}
          <div className="flex justify-center w-full">
            <Logo size="xl" showText={false} />
          </div>
          
          {/* Date, Notifications, Theme Toggle and Status */}
          <div className="flex items-center justify-between w-full px-2">
            <p className="text-xs sm:text-sm text-muted-foreground">{currentDate}</p>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <NotificationBell />
              <ThemeToggle variant="icon" />
              <StatusBadge status="success" label="Online" pulse />
            </div>
          </div>
        </div>

        {/* Pending Project Invitations */}
        {pendingInvitations.length > 0 && (
          <Card className="opacity-0 animate-fade-up stagger-1 border-primary/20 bg-primary/5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="w-5 h-5 text-primary" />
                {t("dashboard.projectInvitations")} ({pendingInvitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.isArray(pendingInvitations) && pendingInvitations.map((invitation: any) => {
                const projectObj = invitation?.projectId && typeof invitation.projectId === 'object'
                  ? invitation.projectId
                  : null;
                const projectName = projectObj?.name || 'Project';
                const projectLocation = projectObj?.location;

                return (
                  <div key={invitation._id} className="p-3 rounded-lg border bg-card">
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium text-sm">{projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          Invited as {invitation.role === 'engineer' ? 'Site Engineer' : 'Project Manager'}
                        </p>
                        {projectLocation && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {projectLocation}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAcceptInvitation(invitation._id)}
                        >
                          <UserPlus className="w-4 h-4 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleRejectInvitation(invitation._id)}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Site Health Score */}
        <Card variant="glow" className="opacity-0 animate-fade-up stagger-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Overall Site Health
                </h2>
                <p className="text-sm text-muted-foreground">
                  Across all active projects
                </p>
                <div className="flex gap-2 mt-4">
                  <StatusBadge 
                    status="success" 
                    label={`${Array.isArray(healthScores) ? healthScores.filter(p => p.healthScore >= 70).length : 0} On Track`} 
                  />
                  <StatusBadge 
                    status="warning" 
                    label={`${Array.isArray(healthScores) ? healthScores.filter(p => p.healthScore < 70 && p.healthScore >= 50).length : 0} At Risk`} 
                  />
                  {Array.isArray(healthScores) && healthScores.filter(p => p.healthScore < 50).length > 0 && (
                    <StatusBadge 
                      status="error" 
                      label={`${healthScores.filter(p => p.healthScore < 50).length} Critical`} 
                    />
                  )}
                </div>
              </div>
              <HealthScoreRing score={healthScore} size="lg" />
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          <KPICard
            title={t("dashboard.activeProjects")}
            value={kpis.activeProjects}
            icon={FolderKanban}
            trend="up"
            trendValue="+1 this month"
            delay={100}
            onClick={() => navigate("/projects")}
          />
          <KPICard
            title={t("dashboard.todayAttendance")}
            value={kpis.attendance}
            suffix="%"
            icon={Users}
            variant="success"
            trend={kpis.attendanceTrend >= 0 ? "up" : kpis.attendanceTrend < 0 ? "down" : undefined}
            trendValue={kpis.attendanceTrend !== 0 
              ? `${kpis.attendanceTrend >= 0 ? '+' : ''}${Math.round(kpis.attendanceTrend)}% vs avg`
              : "Same as avg"
            }
            delay={200}
            onClick={() => navigate("/attendance-details")}
          />
          <KPICard
            title={t("dashboard.pendingApprovals")}
            value={kpis.pendingApprovals}
            icon={Clock}
            variant="warning"
            delay={300}
            onClick={() => navigate("/pending-approvals")}
          />
          <KPICard
            title="Delay Risks"
            value={kpis.delayRisks}
            icon={AlertTriangle}
            variant="destructive"
            delay={400}
            onClick={() => navigate("/insights")}
          />
        </div>

        {/* SiteLens 360 */}
        {hasPermission("canViewSite360") && (
          <Card className="opacity-0 animate-fade-up stagger-4 border-primary/15">
            <CardHeader className="flex-row items-center justify-between pb-3 px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                SiteLens 360
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => navigate("/site360")}
              >
                View
              </Button>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
              <p className="text-sm text-muted-foreground">
                View 360° zones uploaded by site engineers.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Projects Overview */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-4">
          <CardHeader className="flex-row items-center justify-between pb-3 px-4 sm:px-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              {t("projects.title")}
            </CardTitle>
            <button 
              onClick={() => navigate("/projects")}
              className="text-xs sm:text-sm text-primary flex items-center gap-1 tap-target"
            >
              View All <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
            {Array.isArray(projectOverview) && projectOverview.map((project, index) => (
              <div 
                key={index} 
                className="p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate("/projects")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-foreground">{project.name}</span>
                  {project.risk && (
                    <StatusBadge status="warning" label="At Risk" />
                  )}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {project.progress}% complete
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent DPRs - Available to all project members - ALWAYS VISIBLE */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-5">
          {role !== "owner" && (
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-primary" />
                Recent DPRs
              </CardTitle>
              <button 
                onClick={() => navigate("/all-dprs")}
                className="text-sm text-primary flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </CardHeader>
          )}
          <CardContent className={role === "owner" ? "space-y-3 pt-4" : "space-y-3"}>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : recentDPRs.length > 0 ? (
              Array.isArray(recentDPRs) && recentDPRs.map((dpr: any) => (
                <div 
                  key={dpr._id} 
                  className="p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => {
                    navigate(`/dpr/${dpr._id}`, { state: { dpr } });
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {dpr.taskId?.title || 'Task'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dpr.projectName || 'Project'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>By: {dpr.createdBy?.name || t('materials.unknown')}</span>
                        <span>{new Date(dpr.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      {dpr.photos && dpr.photos.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <ImageIcon className="w-3 h-3" />
                          <span>{dpr.photos.length} photo(s)</span>
                        </div>
                      )}
                      {dpr.aiSummary && (
                        <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs font-medium text-primary mb-1">AI Summary</p>
                          <p className="text-xs text-foreground line-clamp-2">{dpr.aiSummary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent DPRs</p>
            )}
          </CardContent>
        </Card>

        {/* AI Insights Preview */}
        {hasPermission("canViewAIInsights") && aiInsight && (
          <Card variant="gradient" className="opacity-0 animate-fade-up stagger-5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-semibold text-sm text-foreground">
                    AI Insight
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    <span className="font-medium text-foreground">{aiInsight.projectName}:</span> {aiInsight.text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1 italic">
                    Generated from site data
                  </p>
                  <button 
                    onClick={() => navigate("/insights")}
                    className="text-xs text-primary mt-2 flex items-center gap-1"
                  >
                    View All Insights <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contractors Card - For Owners and Managers */}
        {(role === 'owner' || role === 'manager') && (
          <Card className="opacity-0 animate-fade-up stagger-6">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="w-5 h-5 text-primary" />
                Contractors ({contractors.length})
              </CardTitle>
              <button 
                onClick={() => navigate("/contractors")}
                className="text-sm text-primary flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : !Array.isArray(contractors) || contractors.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No contractors registered</p>
              ) : (
                <div className="space-y-3">
                  {(Array.isArray(contractors) ? contractors : []).slice(0, 5).map((contractor, index) => (
                    <div
                      key={contractor._id}
                      className="p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate("/contractors")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground">
                            {(contractor.userId as any)?.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">
                            {(contractor.userId as any)?.offsiteId}
                          </p>
                          <div className="flex items-center gap-1 mt-2">
                            {Array.from({ length: 5 }).map((_, i) => {
                              const rating = contractor.rating || 3; // Default 3 stars
                              return (
                                <Star
                                  key={i}
                                  className={`w-3 h-3 ${
                                    i < Math.round(rating)
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-muted-foreground'
                                  }`}
                                />
                              );
                            })}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({contractor.rating ? contractor.rating.toFixed(1) : '3.0'})
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {contractor.assignedProjects.length} project{contractor.assignedProjects.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Contractor Invoices - For Project Managers */}
        {role === 'manager' && pendingContractorInvoices.length > 0 && (
          <Card className="opacity-0 animate-fade-up stagger-6">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="w-5 h-5 text-primary" />
                Pending Contractor Invoices ({pendingContractorInvoices.length})
              </CardTitle>
              <button 
                onClick={() => navigate("/contractors")}
                className="text-sm text-primary flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingContractorInvoices.map((invoice) => (
                  <motion.div
                    key={invoice._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl border bg-card"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {invoice.invoiceNumber || `Invoice #${invoice._id.slice(-6)}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {invoice.projectId?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(invoice.weekStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - {new Date(invoice.weekEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <StatusBadge status="warning" label="PENDING" />
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      <p>👥 Labour Days: {invoice.labourCountTotal}</p>
                      <p>💰 Rate: ₹{invoice.ratePerLabour.toFixed(2)}/day</p>
                      <p>📊 Taxable: ₹{invoice.taxableAmount.toFixed(2)}</p>
                      <p>📊 GST ({invoice.gstRate}%): ₹{invoice.gstAmount.toFixed(2)}</p>
                      <p className="font-semibold text-foreground text-base mt-2">
                        Total: ₹{invoice.totalAmount.toFixed(2)}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleDownloadContractorInvoicePDF(invoice)}
                        disabled={downloadingInvoiceId === invoice._id}
                      >
                        {downloadingInvoiceId === invoice._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        Export PDF
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApproveInvoice(invoice._id)}
                        disabled={approvingInvoiceId === invoice._id}
                      >
                        {approvingInvoiceId === invoice._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Check className="w-4 h-4 mr-2" />
                        )}
                        Approve
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Purchase Invoices Card - For Managers and Owners */}
        {(role === 'manager' || role === 'owner') && Array.isArray(purchaseInvoices) && purchaseInvoices.length > 0 && (
          <Card className="opacity-0 animate-fade-up stagger-7">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Receipt className="w-5 h-5 text-primary" />
                Purchase Invoices ({purchaseInvoices.length})
              </CardTitle>
              <button 
                onClick={() => navigate("/purchase-invoices")}
                className="text-sm text-primary flex items-center gap-1"
              >
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(Array.isArray(purchaseInvoices) ? purchaseInvoices : []).slice(0, 5).map((invoice, index) => (
                  <motion.div
                    key={invoice._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {invoice.invoiceNumber}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {invoice.projectId?.name || 'N/A'}
                        </p>
                      </div>
                      <StatusBadge status="success" label="VERIFIED" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>📦 {invoice.materialName}</p>
                      <p>💰 Total: ₹{invoice.totalAmount.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadPurchaseInvoicePdf(invoice._id)}
                        disabled={downloadingPurchaseInvoiceId === invoice._id}
                        className="flex-1"
                      >
                        {downloadingPurchaseInvoiceId === invoice._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 mr-2" />
                        )}
                        PDF
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Invoices */}
        {/* Recent Invoices - only show for non-owner users (managers) */}
        {role !== 'owner' && recentInvoices.length > 0 && (
          <Card className="opacity-0 animate-fade-up stagger-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {t("dashboard.recentInvoices")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentInvoices.map((invoice: Invoice) => (
                  <InvoiceCard
                    key={invoice._id}
                    invoice={invoice}
                    isSelected={selectedInvoiceId === invoice._id}
                    onSelect={() => setSelectedInvoiceId(selectedInvoiceId === invoice._id ? null : invoice._id)}
                    isOwner={false}
                    canDownloadPdf={true}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* DPR Detail Modal */}
        <Dialog open={isDPRModalOpen} onOpenChange={setIsDPRModalOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>DPR Details</DialogTitle>
            </DialogHeader>
            {selectedDPR && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground">Project</span>
                  <p className="font-medium text-foreground">{selectedDPR.projectName || t('materials.unknown') + ' ' + t('dpr.project')}</p>
                </div>
                
                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground">{t('dpr.task')}</span>
                  <p className="font-medium text-foreground">{selectedDPR.taskId?.title || t('materials.unknown') + ' ' + t('dpr.task')}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground">{t('dpr.createdBy')}</span>
                  <p className="font-medium text-foreground">{selectedDPR.createdBy?.name || t('materials.unknown')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(selectedDPR.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {selectedDPR.notes && (
                  <div className="p-3 rounded-xl bg-muted/50">
                    <span className="text-xs text-muted-foreground">Notes</span>
                    <p className="text-sm text-foreground mt-1">{selectedDPR.notes}</p>
                  </div>
                )}

                {selectedDPR.photos && selectedDPR.photos.length > 0 && (
                  <div className="p-3 rounded-xl bg-muted/50">
                    <span className="text-xs text-muted-foreground mb-2 block">Photos ({selectedDPR.photos.length})</span>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedDPR.photos.map((photo: string, index: number) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`DPR photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedDPR.aiSummary && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <span className="text-xs font-medium text-primary mb-1 block">AI Summary</span>
                    <p className="text-sm text-foreground">{selectedDPR.aiSummary}</p>
                  </div>
                )}

                {selectedDPR.workStoppage?.occurred && (
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                    <span className="text-xs font-medium text-destructive mb-2 block">Work Stoppage</span>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Reason:</span> {selectedDPR.workStoppage.reason?.replace('_', ' ')}</p>
                      <p><span className="text-muted-foreground">Duration:</span> {selectedDPR.workStoppage.durationHours} hours</p>
                      {selectedDPR.workStoppage.remarks && (
                        <p><span className="text-muted-foreground">Remarks:</span> {selectedDPR.workStoppage.remarks}</p>
                      )}
                      {selectedDPR.workStoppage.evidencePhotos && selectedDPR.workStoppage.evidencePhotos.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">Evidence Photos:</span>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {selectedDPR.workStoppage.evidencePhotos.map((photo: string, index: number) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Evidence ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
