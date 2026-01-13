import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/common/ActionButton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { usePermissions } from "@/hooks/usePermissions";
import { FileText, MapPin, Package, ClipboardList, Clock, AlertTriangle, CheckCircle } from "lucide-react";
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
import { Loader2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { NotificationBell } from "@/components/common/NotificationBell";

export default function EngineerDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { userId } = useAppSelector((state) => state.auth);
  const { isOnline, pendingItems } = useAppSelector((state) => state.offline);
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
          
          // Load pending project invitations
          try {
            const invitationsData = await notificationsApi.getMyInvitations();
            console.log('Loaded invitations:', invitationsData);
            setPendingInvitations(Array.isArray(invitationsData) ? invitationsData : []);
          } catch (error) {
            console.error('Error loading invitations:', error);
            setPendingInvitations([]);
          }
          
          // Build recent activity from DPRs and materials
          const activities: any[] = [];
          
          dprs.slice(0, 3).forEach((dpr: any) => {
            const timeAgo = getTimeAgo(new Date(dpr.createdAt));
            activities.push({
              action: `DPR created for ${typeof dpr.projectId === 'object' ? dpr.projectId.name : 'project'}`,
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

        {/* Offline Banner - only show when actually offline or has pending items */}
        {(!isOnline || pendingItems.length > 0) && (
          <div className="opacity-0 animate-fade-up stagger-1">
            <OfflineBanner pendingItems={pendingItems.length} />
          </div>
        )}

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

        {/* Today at a Glance */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-primary" />
              Today at a Glance
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
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <CheckCircle className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Checked In</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(todayAttendance.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {todayAttendance.location}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status="success" label="Active" pulse />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Not Checked In</p>
                        <p className="text-xs text-muted-foreground">Mark your attendance</p>
                      </div>
                    </div>
                    <StatusBadge status="offline" label="Not Active" />
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
                    <StatusBadge status="info" label="Active" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <ClipboardList className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">No Active Tasks</p>
                        <p className="text-xs text-muted-foreground">Check your assigned projects</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pending Requests */}
                {pendingRequests.length > 0 ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-warning/10">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {pendingRequests.length} Pending Request{pendingRequests.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pendingRequests.slice(0, 2).map((r: any) => r.materialName).join(', ')}
                          {pendingRequests.length > 2 && ` +${pendingRequests.length - 2} more`}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status="pending" label="Waiting" />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-success/10">
                        <CheckCircle className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">No Pending Requests</p>
                        <p className="text-xs text-muted-foreground">All requests processed</p>
                      </div>
                    </div>
                  </div>
                )}
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
          </div>
        </div>

        {/* Recent Activity */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
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
