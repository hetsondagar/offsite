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
  Image as ImageIcon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { projectsApi } from "@/services/api/projects";
import { insightsApi } from "@/services/api/insights";
import { materialsApi } from "@/services/api/materials";
import { attendanceApi } from "@/services/api/attendance";
import { notificationsApi } from "@/services/api/notifications";
import { dprApi } from "@/services/api/dpr";
import { invoicesApi, type Invoice } from "@/services/api/invoices";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/common/NotificationBell";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { role } = useAppSelector((state) => state.auth);
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
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDPR, setSelectedDPR] = useState<any | null>(null);
  const [isDPRModalOpen, setIsDPRModalOpen] = useState(false);
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds to get latest data (including new DPRs)
    const refreshInterval = setInterval(() => {
      loadDashboardData();
    }, 30000);
    
    return () => clearInterval(refreshInterval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [projectsData, healthData, delayRisksData, materialsData] = await Promise.all([
        projectsApi.getAll(1, 10),
        insightsApi.getSiteHealth(),
        insightsApi.getDelayRisks(),
        materialsApi.getPending(1, 100),
      ]);

      setProjectOverview(projectsData?.projects || []);
      setHealthScore(healthData?.overallHealthScore || 0);
      setHealthScores(healthData?.projectHealthScores || []);
      
      // Calculate attendance percentage from real data
      let attendancePercentage = 0;
      let attendanceTrend = 0; // Percentage change vs average
      try {
        const projects = projectsData?.projects || [];
        if (projects.length > 0) {
          // Get attendance for all projects
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const attendancePromises = projects.map(async (project: any) => {
            try {
              const attData = await attendanceApi.getByProject(project._id, 1, 100);
              
              // Today's attendance
              const todayAtt = attData?.attendance?.filter((att: any) => {
                const attDate = new Date(att.timestamp);
                attDate.setHours(0, 0, 0, 0);
                return attDate.getTime() === today.getTime() && att.type === 'checkin';
              }) || [];
              const uniqueUsersToday = new Set(todayAtt.map((att: any) => {
                const userId = typeof att.userId === 'object' ? att.userId._id : att.userId;
                return userId.toString();
              }));
              
              // Last 7 days attendance (excluding today) for average
              const pastWeekAtt = attData?.attendance?.filter((att: any) => {
                const attDate = new Date(att.timestamp);
                attDate.setHours(0, 0, 0, 0);
                return attDate >= sevenDaysAgo && attDate < today && att.type === 'checkin';
              }) || [];
              
              // Group by day and count unique users per day
              const dailyCounts: number[] = [];
              const dayMap = new Map<string, Set<string>>();
              pastWeekAtt.forEach((att: any) => {
                const dateKey = att.timestamp.split('T')[0];
                if (!dayMap.has(dateKey)) {
                  dayMap.set(dateKey, new Set());
                }
                const userId = typeof att.userId === 'object' ? att.userId._id : att.userId;
                dayMap.get(dateKey)!.add(userId.toString());
              });
              dayMap.forEach((users) => {
                dailyCounts.push(users.size);
              });
              
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
          let totalEngineers = 0;
          for (const project of projects) {
            if (project.members && Array.isArray(project.members)) {
              // Count engineers in project members
              const engineerCount = project.members.filter((member: any) => {
                const memberRole = typeof member === 'object' ? member.role : null;
                return memberRole === 'engineer';
              }).length;
              totalEngineers += engineerCount;
            }
          }
          
          // If members not populated, fetch from API
          if (totalEngineers === 0) {
            // Fallback: try to get member count from project detail
            try {
              const projectDetails = await Promise.all(
                projects.slice(0, 3).map((p: any) => 
                  projectsApi.getById(p._id).catch(() => null)
                )
              );
              const validProjects = projectDetails.filter(p => p !== null);
              totalEngineers = validProjects.reduce((sum: number, p: any) => {
                if (p?.project?.members) {
                  return sum + p.project.members.filter((m: any) => m.role === 'engineer').length;
                }
                return sum;
              }, 0);
            } catch (error) {
              console.error('Error fetching project details for attendance calculation:', error);
            }
          }
          
          attendancePercentage = totalEngineers > 0 ? Math.round((totalCheckedInToday / totalEngineers) * 100) : 0;
          
          // Calculate trend vs average
          if (totalAvgPastWeek > 0 && totalEngineers > 0) {
            const avgPastWeekPercent = Math.round((totalAvgPastWeek / totalEngineers) * 100);
            attendanceTrend = attendancePercentage - avgPastWeekPercent;
          } else if (totalAvgPastWeek === 0 && attendancePercentage > 0) {
            // If no past data but today has attendance, it's an improvement
            attendanceTrend = attendancePercentage;
          }
        }
      } catch (error) {
        console.error('Error calculating attendance:', error);
      }
      
      setKpis({
        activeProjects: projectsData?.projects?.length || 0,
        attendance: attendancePercentage,
        attendanceTrend: attendanceTrend,
        pendingApprovals: materialsData?.requests?.filter((r: any) => r.status === 'pending').length || 0,
        delayRisks: delayRisksData?.filter((r: any) => r.risk === 'High').length || 0,
      });

      // Load recent DPRs from all projects (available to all project members)
      try {
        const allDPRs: any[] = [];
        const projects = projectsData?.projects || [];
        console.log('Loading DPRs for projects:', projects.length);
        for (const project of projects.slice(0, 5)) { // Limit to first 5 projects to avoid too many calls
          try {
            const dprData = await dprApi.getByProject(project._id, 1, 5);
            console.log(`DPRs for project ${project.name}:`, dprData?.dprs?.length || 0);
            if (dprData?.dprs && dprData.dprs.length > 0) {
              allDPRs.push(...dprData.dprs.map((dpr: any) => ({
                ...dpr,
                projectName: project.name,
                projectId: project._id,
              })));
            }
          } catch (error) {
            console.error(`Error loading DPRs for project ${project._id}:`, error);
          }
        }
        // Sort by creation date (newest first) and take top 10
        allDPRs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        console.log('Total DPRs loaded:', allDPRs.length);
        setRecentDPRs(allDPRs.slice(0, 10));
      } catch (error) {
        console.error('Error loading DPRs:', error);
        setRecentDPRs([]); // Ensure it's set to empty array on error
      }

      // Load AI insight for highest risk project
      try {
        const highRiskProjects = delayRisksData?.filter((r: any) => r.risk === 'High' || r.risk === 'Medium') || [];
        if (highRiskProjects.length > 0) {
          // Get AI explanation for the highest risk project
          const topRiskProject = highRiskProjects[0];
          try {
            const aiExplanation = await insightsApi.getDelayRiskExplanation(topRiskProject.projectId);
            if (aiExplanation && aiExplanation.reasons && aiExplanation.reasons.length > 0) {
              // Build insight text from AI explanation
              const reasons = aiExplanation.reasons.slice(0, 2).join('. ') || '';
              const actions = aiExplanation.actions?.[0] || 'Monitor project status';
              setAiInsight({
                text: `${reasons}. ${actions}`,
                projectName: topRiskProject.projectName,
                projectId: topRiskProject.projectId,
              });
            } else {
              // Fallback to structured insight from delay risk data
              if (topRiskProject.cause) {
                setAiInsight({
                  text: `${topRiskProject.cause}. Impact: ${topRiskProject.impact}`,
                  projectName: topRiskProject.projectName,
                  projectId: topRiskProject.projectId,
                });
              }
            }
          } catch (aiError) {
            console.error('Error loading AI insight:', aiError);
            // Fallback to structured insight from delay risk data
            if (topRiskProject.cause) {
              setAiInsight({
                text: `${topRiskProject.cause}. Impact: ${topRiskProject.impact}`,
                projectName: topRiskProject.projectName,
                projectId: topRiskProject.projectId,
              });
            }
          }
        } else if (projectsData?.projects?.length > 0) {
          // If no high risk projects, get health explanation for first project
          try {
            const firstProject = projectsData.projects[0];
            const healthExplanation = await insightsApi.getHealthExplanation(firstProject._id);
            if (healthExplanation && healthExplanation.focusArea) {
              const interpretation = healthExplanation.interpretation || 'Good';
              setAiInsight({
                text: `Health status: ${interpretation}. Focus: ${healthExplanation.focusArea}`,
                projectName: firstProject.name,
                projectId: firstProject._id,
              });
            }
          } catch (aiError) {
            console.error('Error loading health insight:', aiError);
          }
        }
      } catch (error) {
        console.error('Error loading AI insights:', error);
      }

      // Load recent invoices
      try {
        const invoicesData = await invoicesApi.getAll(1, 50);
        const allInvoices = invoicesData?.invoices || [];
        // Filter invoices created by owner
        const ownerInvoices = allInvoices.filter((inv: Invoice) => {
          const ownerData = typeof inv.ownerId === 'object' ? inv.ownerId : null;
          return ownerData !== null; // Owner-created invoices have ownerId populated
        });
        // Sort by createdAt descending and take first 5
        ownerInvoices.sort((a: Invoice, b: Invoice) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setRecentInvoices(ownerInvoices.slice(0, 5));
      } catch (error) {
        console.error('Error loading invoices:', error);
        setRecentInvoices([]);
      }

      // Load pending project invitations
      try {
        const invitationsData = await notificationsApi.getMyInvitations();
        console.log('Loaded invitations:', invitationsData);
        setPendingInvitations(Array.isArray(invitationsData) ? invitationsData : []);
      } catch (error) {
        console.error('Error loading invitations:', error);
        setPendingInvitations([]);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.acceptInvitation(invitationId);
      toast.success('Project invitation accepted!');
      // Reload dashboard data
      loadDashboardData();
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.rejectInvitation(invitationId);
      toast.success('Invitation rejected');
      // Reload dashboard data
      loadDashboardData();
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      toast.error(error.message || 'Failed to reject invitation');
    }
  };

  return (
    <MobileLayout role={role || "manager"}>
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 safe-area-top max-w-7xl mx-auto w-full overflow-x-hidden">
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
                Project Invitations ({pendingInvitations.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingInvitations.map((invitation: any) => (
                <div key={invitation._id} className="p-3 rounded-lg border bg-card">
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium text-sm">{invitation.projectId?.name || 'Project'}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited as {invitation.role === 'engineer' ? 'Site Engineer' : 'Project Manager'}
                      </p>
                      {invitation.projectId?.location && (
                        <p className="text-xs text-muted-foreground mt-1">
                          📍 {invitation.projectId.location}
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
              ))}
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
                    label={`${healthScores.filter(p => p.healthScore >= 70).length} On Track`} 
                  />
                  <StatusBadge 
                    status="warning" 
                    label={`${healthScores.filter(p => p.healthScore < 70 && p.healthScore >= 50).length} At Risk`} 
                  />
                  {healthScores.filter(p => p.healthScore < 50).length > 0 && (
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
            title="Active Projects"
            value={kpis.activeProjects}
            icon={FolderKanban}
            trend="up"
            trendValue="+1 this month"
            delay={100}
          />
          <KPICard
            title="Today's Attendance"
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
          />
          <KPICard
            title="Pending Approvals"
            value={kpis.pendingApprovals}
            icon={Clock}
            variant="warning"
            delay={300}
          />
          <KPICard
            title="Delay Risks"
            value={kpis.delayRisks}
            icon={AlertTriangle}
            variant="destructive"
            delay={400}
          />
        </div>

        {/* Projects Overview */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-4">
          <CardHeader className="flex-row items-center justify-between pb-3 px-4 sm:px-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              Projects
            </CardTitle>
            <button 
              onClick={() => navigate("/projects")}
              className="text-xs sm:text-sm text-primary flex items-center gap-1 tap-target"
            >
              View All <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
            {projectOverview.map((project, index) => (
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
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : recentDPRs.length > 0 ? (
              recentDPRs.map((dpr: any) => (
                <div 
                  key={dpr._id} 
                  className="p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => {
                    setSelectedDPR(dpr);
                    setIsDPRModalOpen(true);
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
                        <span>By: {dpr.createdBy?.name || 'Unknown'}</span>
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

        {/* Recent Invoices */}
        {/* Recent Invoices - only show for non-owner users (managers) */}
        {role !== 'owner' && recentInvoices.length > 0 && (
          <Card className="opacity-0 animate-fade-up stagger-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Invoices
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
                  <p className="font-medium text-foreground">{selectedDPR.projectName || 'Unknown Project'}</p>
                </div>
                
                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground">Task</span>
                  <p className="font-medium text-foreground">{selectedDPR.taskId?.title || 'Unknown Task'}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground">Created By</span>
                  <p className="font-medium text-foreground">{selectedDPR.createdBy?.name || 'Unknown'}</p>
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
