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
  Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { projectsApi } from "@/services/api/projects";
import { insightsApi } from "@/services/api/insights";
import { materialsApi } from "@/services/api/materials";
import { attendanceApi } from "@/services/api/attendance";
import { notificationsApi } from "@/services/api/notifications";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/common/NotificationBell";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { role } = useAppSelector((state) => state.auth);
  const [projectOverview, setProjectOverview] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState(78);
  const [kpis, setKpis] = useState({
    activeProjects: 0,
    attendance: 0,
    pendingApprovals: 0,
    delayRisks: 0,
  });
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    loadDashboardData();
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
      
      // Calculate attendance percentage from real data
      let attendancePercentage = 0;
      try {
        const projects = projectsData?.projects || [];
        if (projects.length > 0) {
          // Get attendance for all projects
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const attendancePromises = projects.map(async (project: any) => {
            try {
              const attData = await attendanceApi.getByProject(project._id, 1, 100);
              const todayAtt = attData?.attendance?.filter((att: any) => {
                const attDate = new Date(att.timestamp);
                return attDate >= today && att.type === 'checkin';
              }) || [];
              return todayAtt.length;
            } catch {
              return 0;
            }
          });
          
          const attendanceCounts = await Promise.all(attendancePromises);
          const totalCheckedIn = attendanceCounts.reduce((sum, count) => sum + count, 0);
          
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
          
          attendancePercentage = totalEngineers > 0 ? Math.round((totalCheckedIn / totalEngineers) * 100) : 0;
        }
      } catch (error) {
        console.error('Error calculating attendance:', error);
      }
      
      setKpis({
        activeProjects: projectsData?.projects?.length || 0,
        attendance: attendancePercentage,
        pendingApprovals: materialsData?.requests?.filter((r: any) => r.status === 'pending').length || 0,
        delayRisks: delayRisksData?.filter((r: any) => r.risk === 'High').length || 0,
      });

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
      <div className="p-4 space-y-6 safe-area-top">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 opacity-0 animate-fade-up">
          {/* Centered Large Logo */}
          <div className="flex justify-center w-full">
            <Logo size="xl" showText={false} />
          </div>
          
          {/* Date, Notifications, Theme Toggle and Status */}
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-muted-foreground">{currentDate}</p>
            <div className="flex items-center gap-2">
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
                  <StatusBadge status="success" label="4 On Track" />
                  <StatusBadge status="warning" label="1 At Risk" />
                </div>
              </div>
              <HealthScoreRing score={healthScore} size="lg" />
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
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
            trend="up"
            trendValue="+5% vs avg"
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
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              Projects
            </CardTitle>
            <button 
              onClick={() => navigate("/projects")}
              className="text-sm text-primary flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
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

        {/* AI Insights Preview */}
        {hasPermission("canViewAIInsights") && (
          <Card variant="gradient" className="opacity-0 animate-fade-up stagger-5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm text-foreground">
                    AI Insight
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Metro Mall Phase 2 may face a 3-day delay due to pending steel delivery. 
                    Consider expediting the order.
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
      </div>
    </MobileLayout>
  );
}
