import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ArrowLeft, Users, MapPin, Loader2, Calendar, Clock } from "lucide-react";
import { attendanceApi } from "@/services/api/attendance";
import { projectsApi } from "@/services/api/projects";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { PageHeader } from "@/components/common/PageHeader";
import { Label } from "@/components/ui/label";

export default function AttendanceDetailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get('projectId');
  const { role } = useAppSelector((state) => state.auth);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(projectId);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    todayCheckIns: 0,
    totalRecords: 0,
    uniqueUsers: 0,
    totalHoursToday: 0,
  });
  
  // Calculate hours worked for each user per day
  const calculateHoursWorked = (records: any[]) => {
    const userSessions: Record<string, { checkIn: any; checkOut: any | null }> = {};
    
    // Sort records by timestamp
    const sortedRecords = [...records].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    sortedRecords.forEach((record: any) => {
      const userId = typeof record.userId === 'object' ? record.userId._id : record.userId;
      const userIdStr = userId.toString();
      
      if (record.type === 'checkin') {
        if (!userSessions[userIdStr] || userSessions[userIdStr].checkOut) {
          // New session or previous session completed
          userSessions[userIdStr] = { checkIn: record, checkOut: null };
        }
      } else if (record.type === 'checkout') {
        if (userSessions[userIdStr] && !userSessions[userIdStr].checkOut) {
          // Complete the session
          userSessions[userIdStr].checkOut = record;
        }
      }
    });
    
    // Calculate hours for each session
    const hoursByUser: Record<string, number> = {};
    Object.entries(userSessions).forEach(([userId, session]) => {
      if (session.checkIn && session.checkOut) {
        const checkInTime = new Date(session.checkIn.timestamp).getTime();
        const checkOutTime = new Date(session.checkOut.timestamp).getTime();
        const hours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // Convert to hours
        hoursByUser[userId] = (hoursByUser[userId] || 0) + hours;
      } else if (session.checkIn) {
        // Checked in but not checked out - calculate hours until now
        const checkInTime = new Date(session.checkIn.timestamp).getTime();
        const now = new Date().getTime();
        const hours = (now - checkInTime) / (1000 * 60 * 60);
        hoursByUser[userId] = (hoursByUser[userId] || 0) + hours;
      }
    });
    
    return hoursByUser;
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadAttendance();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll(1, 100);
      setProjects(data?.projects || []);
      if (!selectedProject && data?.projects?.length > 0) {
        setSelectedProject(data.projects[0]._id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadAttendance = async () => {
    if (!selectedProject) return;

    try {
      setIsLoading(true);
      const data = await attendanceApi.getByProject(selectedProject, 1, 100);
      const records = data?.attendance || [];
      setAttendance(records);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayCheckIns = records.filter((att: any) => {
        const attDate = new Date(att.timestamp);
        attDate.setHours(0, 0, 0, 0);
        return attDate.getTime() === today.getTime() && att.type === 'checkin';
      });

      const uniqueUsers = new Set(
        records.map((att: any) => {
          const userId = typeof att.userId === 'object' ? att.userId._id : att.userId;
          return userId.toString();
        })
      );

      // Calculate total hours worked today
      const todayRecords = records.filter((att: any) => {
        const attDate = new Date(att.timestamp);
        attDate.setHours(0, 0, 0, 0);
        return attDate.getTime() === today.getTime();
      });
      
      const todayHoursByUser = calculateHoursWorked(todayRecords);
      const totalHoursToday = Object.values(todayHoursByUser).reduce((sum, hours) => sum + hours, 0);
      
      setStats({
        todayCheckIns: todayCheckIns.length,
        totalRecords: records.length,
        uniqueUsers: uniqueUsers.size,
        totalHoursToday: totalHoursToday,
      });
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      toast.error(t('attendance.failedToLoadProjects'));
      setAttendance([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Group attendance by date and calculate hours worked
  const groupedAttendance = attendance.reduce((acc: any, record: any) => {
    const date = new Date(record.timestamp).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {});

  // Calculate hours worked for each user per day
  const calculateHoursWorked = (records: any[]) => {
    const userSessions: Record<string, { checkIn: any; checkOut: any | null }> = {};
    
    // Sort records by timestamp
    const sortedRecords = [...records].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    sortedRecords.forEach((record: any) => {
      const userId = typeof record.userId === 'object' ? record.userId._id : record.userId;
      const userIdStr = userId.toString();
      
      if (record.type === 'checkin') {
        if (!userSessions[userIdStr] || userSessions[userIdStr].checkOut) {
          // New session or previous session completed
          userSessions[userIdStr] = { checkIn: record, checkOut: null };
        }
      } else if (record.type === 'checkout') {
        if (userSessions[userIdStr] && !userSessions[userIdStr].checkOut) {
          // Complete the session
          userSessions[userIdStr].checkOut = record;
        }
      }
    });
    
    // Calculate hours for each session
    const hoursByUser: Record<string, number> = {};
    Object.entries(userSessions).forEach(([userId, session]) => {
      if (session.checkIn && session.checkOut) {
        const checkInTime = new Date(session.checkIn.timestamp).getTime();
        const checkOutTime = new Date(session.checkOut.timestamp).getTime();
        const hours = (checkOutTime - checkInTime) / (1000 * 60 * 60); // Convert to hours
        hoursByUser[userId] = (hoursByUser[userId] || 0) + hours;
      } else if (session.checkIn) {
        // Checked in but not checked out - calculate hours until now
        const checkInTime = new Date(session.checkIn.timestamp).getTime();
        const now = new Date().getTime();
        const hours = (now - checkInTime) / (1000 * 60 * 60);
        hoursByUser[userId] = (hoursByUser[userId] || 0) + hours;
      }
    });
    
    return hoursByUser;
  };

  const sortedDates = Object.keys(groupedAttendance).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <MobileLayout role={role || "manager"}>
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        <PageHeader
          title={t('attendance.attendanceDetails')}
          subtitle={`${stats.totalRecords} ${stats.totalRecords !== 1 ? t('attendance.records') : t('attendance.record')}`}
          showBack={true}
        />

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
          {/* Project Selector */}
          {projects.length > 1 && (
            <Card>
              <CardContent className="p-5">
                <Label htmlFor="project-select-attendance-detail" className="text-sm font-medium text-foreground mb-2 block">
                  {t('materials.project')}
                </Label>
                <select
                  id="project-select-attendance-detail"
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                >
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </CardContent>
            </Card>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs text-muted-foreground">{t('attendance.todayCheckIns')}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{stats.todayCheckIns}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs text-muted-foreground">{t('attendance.totalRecords')}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{stats.totalRecords}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs text-muted-foreground">{t('attendance.uniqueUsers')}</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{stats.uniqueUsers}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs text-muted-foreground">{t('attendance.hoursToday')}</p>
                <p className="text-xl sm:text-2xl font-bold text-primary mt-1">
                  {Math.floor(stats.totalHoursToday)}h {Math.floor((stats.totalHoursToday % 1) * 60)}m
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Records */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : sortedDates.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">{t('attendance.noAttendanceRecords')}</p>
              </CardContent>
            </Card>
          ) : (
            sortedDates.map((date) => (
              <Card key={date} className="animate-fade-up">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const dayRecords = groupedAttendance[date];
                    const hoursByUser = calculateHoursWorked(dayRecords);
                    const sortedRecords = [...dayRecords].sort((a: any, b: any) => 
                      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    );
                    
                    // Group records by user for better display
                    const userGroups: Record<string, any[]> = {};
                    sortedRecords.forEach((record: any) => {
                      const userId = typeof record.userId === 'object' ? record.userId._id : record.userId;
                      const userIdStr = userId.toString();
                      if (!userGroups[userIdStr]) {
                        userGroups[userIdStr] = [];
                      }
                      userGroups[userIdStr].push(record);
                    });
                    
                    return Object.entries(userGroups).map(([userId, userRecords]) => {
                      const userRecord = userRecords[0];
                      const userName = typeof userRecord.userId === 'object' ? userRecord.userId.name : t('materials.unknown') + ' ' + t('common.details');
                      const userPhone = typeof userRecord.userId === 'object' ? userRecord.userId.phone : null;
                      const totalHours = hoursByUser[userId] || 0;
                      const hours = Math.floor(totalHours);
                      const minutes = Math.floor((totalHours - hours) * 60);
                      
                      // Find check-in and check-out times
                      const checkInRecord = userRecords.find((r: any) => r.type === 'checkin');
                      const checkOutRecord = userRecords.find((r: any) => r.type === 'checkout');
                      
                      return (
                        <div key={userId} className="p-4 rounded-lg bg-muted/50 border border-border/30">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <p className="font-semibold text-sm text-foreground">{userName}</p>
                              {userPhone && (
                                <p className="text-xs text-muted-foreground mt-0.5">{userPhone}</p>
                              )}
                            </div>
                            {totalHours > 0 && (
                              <div className="text-right">
                                <p className="text-xs text-muted-foreground">{t('attendance.hoursWorked')}</p>
                                <p className="text-sm font-semibold text-primary">
                                  {hours}h {minutes}m
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            {userRecords
                              .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
                              .map((record: any) => (
                                <div key={record._id} className="p-2.5 rounded-lg bg-background/50 border border-border/20">
                                  <div className="flex items-center justify-between mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <StatusBadge
                                        status={record.type === 'checkin' ? 'success' : 'info'}
                                        label={record.type === 'checkin' ? 'Check-in' : 'Check-out'}
                                      />
                                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {new Date(record.timestamp).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                          second: '2-digit'
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                  {record.location && (
                                    <div className="flex items-start gap-2 mt-1.5">
                                      <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                                      <p className="text-xs text-muted-foreground flex-1">{record.location}</p>
                                    </div>
                                  )}
                                  {(record.latitude && record.longitude) && (
                                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                                      {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
                                    </p>
                                  )}
                                  {checkInRecord && checkOutRecord && record.type === 'checkout' && (
                                    <div className="mt-2 pt-2 border-t border-border/20">
                                      <p className="text-xs text-muted-foreground">
                                        {t('attendance.duration')}: {(() => {
                                          const checkInTime = new Date(checkInRecord.timestamp).getTime();
                                          const checkOutTime = new Date(checkOutRecord.timestamp).getTime();
                                          const durationMs = checkOutTime - checkInTime;
                                          const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
                                          const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
                                          return `${durationHours}h ${durationMinutes}m`;
                                        })()}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
