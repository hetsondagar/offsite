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
  });

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

      setStats({
        todayCheckIns: todayCheckIns.length,
        totalRecords: records.length,
        uniqueUsers: uniqueUsers.size,
      });
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance');
      setAttendance([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Group attendance by date
  const groupedAttendance = attendance.reduce((acc: any, record: any) => {
    const date = new Date(record.timestamp).toDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(record);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedAttendance).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <MobileLayout role={role || "manager"}>
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-3 sm:py-4 pl-0 pr-3 sm:pr-4 safe-area-top">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 flex flex-col">
              <h1 className="font-display font-semibold text-base sm:text-lg">Attendance Details</h1>
              <p className="text-xs text-muted-foreground">{stats.totalRecords} records</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
          {/* Project Selector */}
          {projects.length > 1 && (
            <Card>
              <CardContent className="p-4">
                <select
                  value={selectedProject || ''}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full p-2 rounded-lg bg-background border border-border text-foreground"
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
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{stats.todayCheckIns}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{stats.totalRecords}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 sm:p-4 text-center">
                <p className="text-xs text-muted-foreground">Users</p>
                <p className="text-xl sm:text-2xl font-bold text-foreground mt-1">{stats.uniqueUsers}</p>
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
                <p className="text-sm text-muted-foreground">No attendance records</p>
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
                  {groupedAttendance[date]
                    .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((record: any) => (
                      <div key={record._id} className="p-3 rounded-lg bg-muted/50 border border-border/30">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-foreground">
                              {typeof record.userId === 'object' ? record.userId.name : 'Unknown User'}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <StatusBadge
                                status={record.type === 'checkin' ? 'success' : 'info'}
                                label={record.type === 'checkin' ? 'Check-in' : 'Check-out'}
                              />
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(record.timestamp).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                        {record.location && (
                          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-border/20">
                            <MapPin className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground flex-1">{record.location}</p>
                          </div>
                        )}
                        {(record.latitude && record.longitude) && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {record.latitude.toFixed(6)}, {record.longitude.toFixed(6)}
                          </p>
                        )}
                      </div>
                    ))}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
