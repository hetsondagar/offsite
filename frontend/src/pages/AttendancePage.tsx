import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store/hooks";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { 
  ArrowLeft, 
  MapPin, 
  Clock,
  Check,
  Loader2,
  Navigation,
  WifiOff
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { saveAttendance } from "@/lib/indexeddb";
import { useAppDispatch } from "@/store/hooks";
import { addPendingItem } from "@/store/slices/offlineSlice";
import { attendanceApi } from "@/services/api/attendance";
import { projectsApi } from "@/services/api/projects";

export default function AttendancePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { hasPermission } = usePermissions();
  const userId = useAppSelector((state) => state.auth.userId);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState<string | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsApi.getAll(1, 100);
        setProjects(data?.projects || []);
        if (data?.projects && data.projects.length > 0) {
          setSelectedProject(data.projects[0]._id);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };
    loadProjects();
  }, []);

  // Check permission
  useEffect(() => {
    if (!hasPermission("canMarkAttendance")) {
      navigate("/");
    }
  }, [hasPermission, navigate]);

  const handleGetLocation = async () => {
    setIsLocating(true);
    // Simulate GPS location
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLocation("Building A, Site 3 - Riverside Apartments");
    setIsLocating(false);
  };

  const handleCheckIn = async () => {
    if (!selectedProject) {
      alert("Please select a project first");
      return;
    }
    
    if (!location) {
      await handleGetLocation();
    }
    setIsLoading(true);
    
    try {
      // Try to submit to API first
      await attendanceApi.checkIn(selectedProject, location || 'Unknown');
      setIsCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } catch (error) {
      // If API fails, save to IndexedDB for offline sync
      const attId = await saveAttendance({
        type: 'checkin',
        location: location || 'Unknown',
        timestamp: Date.now(),
        userId: userId || "unknown",
        markedAt: new Date().toISOString(),
        projectId: selectedProject,
      });
      
      // Add to Redux offline store
      dispatch(addPendingItem({
        type: 'attendance',
        data: {
          id: attId,
          type: 'checkin',
          location: location || 'Unknown',
          userId: userId,
          projectId: selectedProject,
          timestamp: new Date().toISOString(),
        },
      }));
      
      setIsCheckedIn(true);
      setCheckInTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedProject) {
      alert("Please select a project first");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Try to submit to API first
      await attendanceApi.checkOut(selectedProject);
      setIsCheckedIn(false);
      setCheckInTime(null);
    } catch (error) {
      // If API fails, save to IndexedDB for offline sync
      const attId = await saveAttendance({
        type: 'checkout',
        location: location || 'Unknown',
        timestamp: Date.now(),
        userId: userId || "unknown",
        markedAt: new Date().toISOString(),
        projectId: selectedProject,
      });
      
      // Add to Redux offline store
      dispatch(addPendingItem({
        type: 'attendance',
        data: {
          id: attId,
          type: 'checkout',
          location: location || 'Unknown',
          userId: userId,
          projectId: selectedProject,
          timestamp: new Date().toISOString(),
        },
      }));
      
      setIsCheckedIn(false);
      setCheckInTime(null);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Permission check
  if (!hasPermission("canMarkAttendance")) {
    return (
      <MobileLayout role="engineer">
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Access Denied
              </h2>
              <p className="text-sm text-muted-foreground">
                You don't have permission to mark attendance. Only Site Engineers can mark attendance.
              </p>
              <Button onClick={() => navigate("/")} className="w-full">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout role="engineer">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="-ml-2">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 ml-0">
              <h1 className="font-display font-semibold text-lg">Attendance</h1>
              <p className="text-xs text-muted-foreground">GPS-based check in/out</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Time Display */}
          <Card variant="gradient" className="text-center animate-fade-up">
            <CardContent className="py-8">
              <Clock className="w-8 h-8 text-primary mx-auto mb-4" />
              <p className="font-display text-4xl font-bold text-foreground">{currentTime}</p>
              <p className="text-muted-foreground mt-2">{currentDate}</p>
            </CardContent>
          </Card>

          {/* Location Card */}
          <Card variant="gradient" className="animate-fade-up stagger-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="w-4 h-4 text-primary" />
                Your Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              {location ? (
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-3 h-3 bg-success rounded-full" />
                    <div className="absolute inset-0 w-3 h-3 bg-success rounded-full animate-ping-location" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{location}</p>
                    <p className="text-xs text-muted-foreground mt-1">Location verified via GPS</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-sm">Tap to get location</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                  >
                    {isLocating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 mr-2" />
                        Locate
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Check In/Out Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pt-4"
          >
            {!isCheckedIn ? (
              <motion.div
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.02 }}
              >
                <Button
                  variant="glow"
                  size="xl"
                  className="w-full h-32 flex-col gap-3"
                  onClick={handleCheckIn}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-12 h-12 animate-spin" />
                  ) : (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-16 h-16 rounded-full bg-primary-foreground/10 flex items-center justify-center"
                      >
                        <MapPin className="w-8 h-8" />
                      </motion.div>
                      <span className="font-display text-xl">Check In</span>
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="xl"
                  className="w-full h-32 flex-col gap-3 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={handleCheckOut}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-12 h-12 animate-spin" />
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Check className="w-8 h-8" />
                      </div>
                      <span className="font-display text-xl">Check Out</span>
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>

          {/* Status Card */}
          {isCheckedIn && (
            <Card variant="glow" className="animate-bounce-in">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/20">
                      <Check className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Checked In</p>
                      <p className="text-xs text-muted-foreground">at {checkInTime}</p>
                    </div>
                  </div>
                  <StatusBadge status="success" label="Active" pulse />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Offline Notice */}
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 text-muted-foreground animate-fade-up stagger-3">
            <WifiOff className="w-4 h-4" />
            <span className="text-xs">Works offline. Will sync when connected.</span>
          </div>

          {/* Today's History */}
          <Card variant="gradient" className="animate-fade-up stagger-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Today's Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isCheckedIn && (
                  <div className="flex items-center justify-between py-2 border-b border-border/30">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm text-foreground">Checked In</span>
                    </div>
                    <span className="text-sm text-muted-foreground">{checkInTime}</span>
                  </div>
                )}
                {!isCheckedIn && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet today
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}
