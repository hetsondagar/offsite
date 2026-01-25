import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/common/ActionButton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { usePermissions } from "@/hooks/usePermissions";
import { useTranslation } from "react-i18next";
import { FileText, MapPin, Package, ClipboardList, Clock, AlertTriangle, CheckCircle, Wrench, FileCheck, Receipt } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { dprApi } from "@/services/api/dpr";
import { attendanceApi } from "@/services/api/attendance";
import { materialsApi } from "@/services/api/materials";
import { projectsApi } from "@/services/api/projects";
import { tasksApi } from "@/services/api/tasks";
import { notificationsApi } from "@/services/api/notifications";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";
import { Loader2, UserPlus, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/common/NotificationBell";
import { usePendingFromIndexedDB } from "@/hooks/usePendingFromIndexedDB";
import { runSync } from "@/lib/syncEngine";

export default function EngineerDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const { userId } = useAppSelector((state) => state.auth);
  const { isOnline } = useAppSelector((state) => state.offline);
  const { pendingCount, refresh } = usePendingFromIndexedDB();
  const [isSyncing, setIsSyncing] = useState(false);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load user's assigned projects
      const projectsData = await projectsApi.getAll(1, 10);
      const projects = projectsData?.projects || [];
      
      if (projects.length > 0) {
        const firstProject = projects[0];
        
        // Load today's attendance
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const attendanceData = await attendanceApi.getByProject(firstProject._id, 1, 1);
          const todayAtt = attendanceData?.attendance?.find((att: any) => {
            const attDate = new Date(att.timestamp);
            return attDate >= today && att.type === 'checkin';
          });
          setTodayAttendance(todayAtt);
        } catch (error) {
          console.error('Error loading attendance:', error);
        }
        
        // Load tasks for the project
        try {
          const tasks = await tasksApi.getAll(firstProject._id);
          const activeTasks = tasks?.filter((t: any) => t.status === 'in-progress') || [];
          setTodayTasks(activeTasks.slice(0, 1));
        } catch (error) {
          console.error('Error loading tasks:', error);
        }
        
        // Load recent DPRs
        try {
          const dprData = await dprApi.getByProject(firstProject._id, 1, 5);
          const dprs = dprData?.dprs || [];
          
          // Load pending material requests
          const materialsData = await materialsApi.getPending(1, 10);
          const requests = materialsData?.requests || [];
          const userRequests = requests.filter((r: any) => {
            const requestedBy = typeof r.requestedBy === 'object' ? r.requestedBy._id : r.requestedBy;
            return requestedBy === userId && r.status === 'pending';
          });
          setPendingRequests(userRequests);
          
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
            if (error?.message?.includes('Unauthorized') || error?.message?.includes('No token')) {
              setPendingInvitations([]);
            } else {
              console.error('Error loading invitations:', error);
              setPendingInvitations([]);
            }
          }
          
          // Build recent activity from DPRs and materials
          const activities: any[] = [];
          
          dprs.slice(0, 3).forEach((dpr: any) => {
            const timeAgo = getTimeAgo(new Date(dpr.createdAt));
            activities.push({
              action: `DPR created for ${dpr.projectId && typeof dpr.projectId === 'object' ? dpr.projectId.name : 'project'}`,
              time: timeAgo,
              status: "success",
            });
          });
          
          userRequests.slice(0, 2).forEach((req: any) => {
            const timeAgo = getTimeAgo(new Date(req.createdAt));
            activities.push({
              action: `Material request: ${req.materialName}`,
              time: timeAgo,
              status: req.status === 'approved' ? "success" : "pending",
            });
          });
          
          setRecentActivity(activities.sort((a, b) => {
            // Sort by time (most recent first)
            return 0; // Simplified - in production, parse time strings
          }).slice(0, 5));
        } catch (error) {
          console.error('Error loading activity:', error);
        }
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.acceptInvitation(invitationId);
      toast.success(t("messages.invitationAccepted"));
      // Reload dashboard data
      loadDashboardData();
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || t("messages.failedToAccept"));
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.rejectInvitation(invitationId);
      toast.success(t("messages.invitationRejected"));
      loadDashboardData();
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      toast.error(error.message || t("messages.failedToReject"));
    }
  };

  const handleBannerSync = async () => {
    if (isSyncing || !isOnline) return;
    setIsSyncing(true);
    try {
      await runSync();
      await refresh();
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <MobileLayout role="engineer">
      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 safe-area-top w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="flex flex-col items-center gap-3 sm:gap-4 opacity-0 animate-fade-up">
          {/* Centered Large Logo */}
          <div className="flex justify-center w-full">
            <Logo size="xl" showText={false} />
          </div>
          
          {/* Time, Notifications, and Theme Toggle */}
          <div className="flex items-center justify-between w-full px-2">
            <div className="text-left">
              <p className="text-sm sm:text-base font-medium text-foreground">{currentTime}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">{currentDate}</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <NotificationBell />
              <ThemeToggle variant="icon" />
            </div>
          </div>
        </div>

        {!isOnline && (
          <div className="opacity-0 animate-fade-up stagger-1">
            <OfflineBanner pendingItems={pendingCount} onSync={handleBannerSync} isSyncing={isSyncing} />
          </div>
        )}
        {isOnline && pendingCount > 0 && (
          <div className="opacity-0 animate-fade-up stagger-1 bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <RefreshCw className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Online — {pendingCount} item{pendingCount !== 1 ? 's' : ''} pending sync</p>
                <p className="text-xs text-muted-foreground">Data will sync automatically</p>
              </div>
            </div>
          </div>
        )}

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
              {pendingInvitations.map((invitation: any) => (
                <div key={invitation._id} className="p-3 rounded-lg border bg-card">
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium text-sm">{invitation.projectId?.name || t("pages.projects")}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("dashboard.invitedAs")} {invitation.role === 'engineer' ? t("dashboard.siteEngineer") : t("dashboard.projectManager")}
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
                        {t("common.accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRejectInvitation(invitation._id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        {t("common.reject")}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Today at a Glance */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-primary" />
              {t("dashboard.today")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Attendance Status */}
                {todayAttendance ? (
                  <div 
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate("/attendance-details")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <CheckCircle className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("dashboard.checkIn")}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(todayAttendance.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {todayAttendance.location}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status="success" label={t("status.active")} pulse />
                  </div>
                ) : (
                  <div 
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate("/attendance")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("dashboard.notCheckedIn")}</p>
                        <p className="text-xs text-muted-foreground">{t("dashboard.markAttendance")}</p>
                      </div>
                    </div>
                    <StatusBadge status="info" label={t("dashboard.notCheckedIn")} />
                  </div>
                )}

                {/* Today's Task */}
                {todayTasks.length > 0 ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ClipboardList className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{todayTasks[0].title}</p>
                        <p className="text-xs text-muted-foreground">
                          {todayTasks[0].status.replace('-', ' ')} · {todayTasks[0].progress || 0}% done
                        </p>
                      </div>
                    </div>
                    <StatusBadge status="info" label={t("status.active")} />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("dashboard.noTasks")}</p>
                        <p className="text-xs text-muted-foreground">{t("dashboard.viewTasks")}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Requests */}
                {pendingRequests.length > 0 ? (
                  <div 
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => navigate("/materials")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {pendingRequests.length} {t("dashboard.pendingRequests")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pendingRequests.slice(0, 2).map((r: any) => r.materialName).join(', ')}
                          {pendingRequests.length > 2 && ` +${pendingRequests.length - 2} more`}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status="pending" label={t("status.pending")} />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <CheckCircle className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{t("dashboard.noPendingRequests")}</p>
                        <p className="text-xs text-muted-foreground">{t("messages.saved")}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirm Materials (Pending GRN) */}
                <div 
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => navigate("/purchase-history")}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <Package className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Confirm Materials</p>
                      <p className="text-xs text-muted-foreground">Verify deliveries and generate GRN</p>
                    </div>
                  </div>
                  <StatusBadge status="warning" label="Pending GRN" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-base sm:text-lg text-foreground opacity-0 animate-fade-up stagger-3 px-2">
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {hasPermission("canCreateDPR") && (
              <div className="opacity-0 animate-fade-up stagger-3">
                <ActionButton
                  icon={FileText}
                  label="Create DPR"
                  sublabel="Daily Report"
                  variant="glow"
                  onClick={() => navigate("/dpr")}
                />
              </div>
            )}
            {hasPermission("canMarkAttendance") && (
              <div className="opacity-0 animate-fade-up stagger-4">
                <ActionButton
                  icon={MapPin}
                  label="Attendance"
                  sublabel="Check In/Out"
                  variant="outline"
                  onClick={() => navigate("/attendance")}
                />
              </div>
            )}
            {hasPermission("canRaiseMaterialRequest") && (
              <div className="opacity-0 animate-fade-up stagger-5 col-span-2 sm:col-span-1">
                <ActionButton
                  icon={Package}
                  label="Request Materials"
                  sublabel="Raise new request"
                  variant="outline"
                  onClick={() => navigate("/materials")}
                />
              </div>
            )}

            {hasPermission("canViewTools") && (
              <div className="opacity-0 animate-fade-up stagger-6">
                <ActionButton
                  icon={Wrench}
                  label="Tools"
                  sublabel="Issue/Return tools"
                  variant="outline"
                  onClick={() => navigate("/tools")}
                />
              </div>
            )}

            {hasPermission("canViewPermits") && (
              <div className="opacity-0 animate-fade-up stagger-7">
                <ActionButton
                  icon={FileCheck}
                  label="Permits"
                  sublabel="Manage permits"
                  variant="outline"
                  onClick={() => navigate("/permits")}
                />
              </div>
            )}

            {hasPermission("canSubmitPettyCash") && (
              <div className="opacity-0 animate-fade-up stagger-8">
                <ActionButton
                  icon={Receipt}
                  label="Reimbursements"
                  sublabel="Submit expenses"
                  variant="outline"
                  onClick={() => navigate("/petty-cash")}
                />
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("Recent Activity")}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <span className="text-sm text-foreground">{item.action}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{item.time}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        item.status === "success" ? "bg-success" : "bg-warning"
                      }`} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
