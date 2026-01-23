import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
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
  WifiOff,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { saveAttendance } from "@/lib/indexeddb";
import { useAppDispatch } from "@/store/hooks";
import { addPendingItem } from "@/store/slices/offlineSlice";
import { attendanceApi } from "@/services/api/attendance";
import { projectsApi } from "@/services/api/projects";
import { toast } from "sonner";
import { getCurrentPosition, watchPosition, clearWatch } from "@/lib/capacitor-geolocation";
import { getMapTilerKey } from "@/lib/config";

const MAPTILER_KEY = getMapTilerKey();

interface LocationData {
  latitude: number;
  longitude: number;
  address: string;
}

export default function AttendancePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const userId = useAppSelector((state) => state.auth.userId);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const watchIdRef = useRef<number | string | null>(null);

  // Load projects and check existing check-in status
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await projectsApi.getAll(1, 100);
        setProjects(data?.projects || []);
        if (data?.projects && data.projects.length > 0) {
          setSelectedProject(data.projects[0]._id);
        } else {
          toast.warning(t("attendance.noProjects"));
        }
      } catch (error: any) {
        console.error('Error loading projects:', error);
        const errorMessage = error?.message || t("attendance.failedToLoadProjects");
        toast.error(errorMessage);
        // Set empty projects array to prevent further errors
        setProjects([]);
      }
    };
    loadProjects();
  }, []);

  // Check for existing check-in status on page load and periodically
  useEffect(() => {
    const checkExistingCheckIn = async () => {
      try {
        const todayStatus = await attendanceApi.getTodayCheckIn();
        if (todayStatus.isCheckedIn && todayStatus.checkIn) {
          setIsCheckedIn(true);
          const checkInTimeStr = new Date(todayStatus.checkIn.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
          setCheckInTime(checkInTimeStr);
          setSelectedProject(todayStatus.checkIn.projectId);
          
          // Store in localStorage for persistence
          localStorage.setItem('attendance_checkIn', JSON.stringify({
            isCheckedIn: true,
            checkInTime: checkInTimeStr,
            projectId: todayStatus.checkIn.projectId,
            timestamp: todayStatus.checkIn.timestamp,
          }));
          
          // Set location from check-in data
          if (todayStatus.checkIn.latitude && todayStatus.checkIn.longitude) {
            setLocation({
              latitude: todayStatus.checkIn.latitude,
              longitude: todayStatus.checkIn.longitude,
              address: todayStatus.checkIn.location,
            });
            
            // Start GPS watching for continuous tracking
            startLocationWatching();
          }
        } else {
          // Not checked in - clear localStorage
          localStorage.removeItem('attendance_checkIn');
          setIsCheckedIn(false);
          setCheckInTime(null);
        }
      } catch (error: any) {
        console.error('Error checking existing check-in:', error);
        // Fallback to localStorage if API fails
        try {
          const stored = localStorage.getItem('attendance_checkIn');
          if (stored) {
            const checkInData = JSON.parse(stored);
            // Check if it's from today
            const storedDate = new Date(checkInData.timestamp);
            const today = new Date();
            if (storedDate.toDateString() === today.toDateString()) {
              setIsCheckedIn(true);
              setCheckInTime(checkInData.checkInTime);
              setSelectedProject(checkInData.projectId);
            } else {
              // Old check-in, clear it
              localStorage.removeItem('attendance_checkIn');
            }
          }
        } catch (storageError) {
          console.error('Error reading from localStorage:', storageError);
        }
      }
    };
    
    // Check immediately
    checkExistingCheckIn();
    
    // Set up periodic refresh every 30 seconds to keep status in sync
    const intervalId = setInterval(checkExistingCheckIn, 30000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // Check permission
  useEffect(() => {
    if (!hasPermission("canMarkAttendance")) {
      navigate("/");
    }
  }, [hasPermission, navigate]);

  // Initialize MapTiler map when location is available
  useEffect(() => {
    if (location && mapContainerRef.current && !mapInstanceRef.current) {
      // Check if MapTiler SDK is already loaded
      // @ts-ignore
      const maptiler = window.maptilerSdk || window.maptiler;
      if (maptiler && mapContainerRef.current) {
        // @ts-ignore
        maptiler.config.apiKey = MAPTILER_KEY;
        // @ts-ignore
        const map = new maptiler.Map({
          container: mapContainerRef.current,
          style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=' + MAPTILER_KEY,
          center: [location.longitude, location.latitude],
          zoom: 16,
        });

        // Add marker
        // @ts-ignore
        new maptiler.Marker({ color: '#3b82f6' })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map);

        mapInstanceRef.current = map;
        return;
      }

      // Load MapTiler SDK from CDN (more reliable than GL JS)
      const script = document.createElement('script');
      script.src = `https://unpkg.com/@maptiler/sdk@latest/dist/maptiler-sdk.umd.js`;
      script.onload = () => {
        // @ts-ignore
        const maptiler = window.maptilerSdk || window.maptiler;
        if (maptiler && mapContainerRef.current) {
          // @ts-ignore
          maptiler.config.apiKey = MAPTILER_KEY;
          // @ts-ignore
          const map = new maptiler.Map({
            container: mapContainerRef.current,
            style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=' + MAPTILER_KEY,
            center: [location.longitude, location.latitude],
            zoom: 16,
          });

          // Add marker
          // @ts-ignore
          new maptiler.Marker({ color: '#3b82f6' })
            .setLngLat([location.longitude, location.latitude])
            .addTo(map);

          mapInstanceRef.current = map;
        }
      };
      script.onerror = () => {
        console.error('Failed to load MapTiler SDK');
        toast.error('Failed to load map library');
      };
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.href = 'https://unpkg.com/@maptiler/sdk@latest/dist/maptiler-sdk.css';
      link.rel = 'stylesheet';
      link.onerror = () => {
        console.error('Failed to load MapTiler SDK CSS');
      };
      document.head.appendChild(link);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [location]);

  const updateLocationFromCoordinates = async (latitude: number, longitude: number) => {
    // Reverse geocode using MapTiler
    try {
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${longitude},${latitude}.json?key=${MAPTILER_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();

      let address = `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        address = feature.properties?.label || feature.place_name || address;
      }

      setLocation({
        latitude,
        longitude,
        address,
      });
    } catch (geocodeError) {
      console.error('Geocoding error:', geocodeError);
      // Still set location with coordinates even if geocoding fails
      setLocation({
        latitude,
        longitude,
        address: `Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      });
    }
  };

  const startLocationWatching = async () => {
    // Clear any existing watch
    if (watchIdRef.current !== null) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Start watching position
    try {
      watchIdRef.current = await watchPosition(
        (locationData) => {
          if (locationData && locationData.latitude && locationData.longitude) {
            updateLocationFromCoordinates(locationData.latitude, locationData.longitude);
          }
        },
        (error) => {
          console.error('Location watch error:', error);
          // If watch fails, try to get location once manually
          handleGetLocation().catch(() => {
            // Silent fail - user can manually retry
          });
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 10000, // Update every 10 seconds
        }
      );
    } catch (error: any) {
      console.error('Failed to start location watching:', error);
      // If watching fails, location can still be obtained manually
      // Don't show error to user - they can use "Get Location" button
    }
  };

  const handleGetLocation = async () => {
    setIsLocating(true);
    setLocationError(null);

    try {
      // Request permissions first (especially important for Android)
      const locationData = await getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000, // 30 seconds timeout
        maximumAge: 60000, // Accept cached position up to 1 minute old
      });

      if (!locationData || !locationData.latitude || !locationData.longitude) {
        throw new Error('Invalid location data received');
      }

      const { latitude, longitude } = locationData;
      await updateLocationFromCoordinates(latitude, longitude);
      toast.success('Location captured successfully');
    } catch (error: any) {
      console.error('Location error:', error);
      
      // Provide user-friendly error messages based on error code
      let errorMessage = 'Failed to get location. ';
      
      // Handle different error types
      if (error.message?.includes('permission denied') || error.code === 1 || error.message?.includes('Permission denied')) {
        errorMessage = 'Location permission denied. Please enable location permissions in your device settings and try again.';
      } else if (error.message?.includes('position unavailable') || error.code === 2 || error.message?.includes('Position unavailable')) {
        errorMessage = 'Location unavailable. Please check your GPS settings and ensure you are in an area with good GPS signal.';
      } else if (error.message?.includes('timeout') || error.code === 3 || error.message?.includes('Timeout')) {
        errorMessage = 'Location request timed out. Please try again. Make sure you are in an area with good GPS signal.';
      } else if (error.message?.includes('not supported') || error.message?.includes('Geolocation not supported')) {
        errorMessage = 'Geolocation is not supported on this device.';
      } else {
        errorMessage += error.message || 'Please enable location permissions and ensure GPS is enabled.';
      }
      
      setLocationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLocating(false);
    }
  };

  const handleCheckIn = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }
    
    if (!location) {
      toast.error("Please get your location first");
      return;
    }

    setIsLoading(true);
    
    try {
      // Try to submit to API first
      const result = await attendanceApi.checkIn(
        selectedProject, 
        location.latitude, 
        location.longitude,
        location.address
      );
      const checkInTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setIsCheckedIn(true);
      setCheckInTime(checkInTimeStr);
      
      // Store in localStorage for persistence
      localStorage.setItem('attendance_checkIn', JSON.stringify({
        isCheckedIn: true,
        checkInTime: checkInTimeStr,
        projectId: selectedProject,
        timestamp: new Date().toISOString(),
      }));
      
      // Start GPS watching for continuous tracking
      startLocationWatching();
      
      toast.success('Checked in successfully!');
    } catch (error: any) {
      // If API fails, save to IndexedDB for offline sync
      const attId = await saveAttendance({
        projectId: selectedProject,
        type: 'checkin',
        location: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        timestamp: Date.now(),
        userId: userId || "unknown",
        markedAt: new Date().toISOString(),
      });
      
      // Add to Redux offline store
      dispatch(addPendingItem({
        type: 'attendance',
        data: {
          id: attId,
          type: 'checkin',
          location: location.address,
          latitude: location.latitude,
          longitude: location.longitude,
          userId: userId,
          projectId: selectedProject,
          timestamp: new Date().toISOString(),
        },
      }));
      
      const checkInTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setIsCheckedIn(true);
      setCheckInTime(checkInTimeStr);
      
      // Store in localStorage for persistence
      localStorage.setItem('attendance_checkIn', JSON.stringify({
        isCheckedIn: true,
        checkInTime: checkInTimeStr,
        projectId: selectedProject,
        timestamp: new Date().toISOString(),
      }));
      
      // Start GPS watching for continuous tracking even in offline mode
      startLocationWatching();
      
      toast.success('Checked in (offline mode)');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!selectedProject) {
      toast.error("Please select a project first");
      return;
    }
    
    setIsLoading(true);
    
    // Stop GPS watching
    if (watchIdRef.current !== null) {
      clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    // Declare checkoutLocation outside try block so it's accessible in catch block
    let checkoutLocation: LocationData | null = location;
    
    try {
      // Use current location if available, otherwise use check-in location
      checkoutLocation = location;
      
      // Try to get fresh location for checkout
      try {
        const locationData = await getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        });
        
        await updateLocationFromCoordinates(locationData.latitude, locationData.longitude);
        checkoutLocation = {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
          address: location?.address || `Coordinates: ${locationData.latitude.toFixed(6)}, ${locationData.longitude.toFixed(6)}`,
        };
      } catch (error) {
        // Location not available, will use existing location
        console.warn('Checkout location not available, using current location:', error);
      }

      // Try to submit to API first
      await attendanceApi.checkOut(
        selectedProject,
        checkoutLocation?.latitude,
        checkoutLocation?.longitude
      );
      setIsCheckedIn(false);
      setCheckInTime(null);
      
      // Clear localStorage
      localStorage.removeItem('attendance_checkIn');
      
      toast.success('Checked out successfully!');
    } catch (error: any) {
      // If API fails, save to IndexedDB for offline sync
      const attId = await saveAttendance({
        projectId: selectedProject,
        type: 'checkout',
        location: checkoutLocation?.address || location?.address || 'Unknown',
        latitude: checkoutLocation?.latitude || location?.latitude,
        longitude: checkoutLocation?.longitude || location?.longitude,
        timestamp: Date.now(),
        userId: userId || "unknown",
        markedAt: new Date().toISOString(),
      });
      
      // Add to Redux offline store
      dispatch(addPendingItem({
        type: 'attendance',
        data: {
          id: attId,
          type: 'checkout',
          location: checkoutLocation?.address || location?.address || 'Unknown',
          latitude: checkoutLocation?.latitude || location?.latitude,
          longitude: checkoutLocation?.longitude || location?.longitude,
          userId: userId,
          projectId: selectedProject,
          timestamp: new Date().toISOString(),
        },
      }));
      
      setIsCheckedIn(false);
      setCheckInTime(null);
      
      // Clear localStorage
      localStorage.removeItem('attendance_checkIn');
      
      toast.success('Checked out (offline mode)');
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
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-3 sm:py-4 pl-0 pr-3 sm:pr-4 safe-area-top">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-2 sm:mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-base sm:text-lg">{t("attendance.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("attendance.checkIn")} / {t("attendance.checkOut")}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto w-full">
          {/* Time Display */}
          <Card variant="gradient" className="text-center animate-fade-up">
            <CardContent className="py-6 sm:py-8 px-4">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-3 sm:mb-4" />
              <p className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground">{currentTime}</p>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">{currentDate}</p>
            </CardContent>
          </Card>

          {/* Project Selector */}
          {projects.length > 0 && (
            <Card variant="gradient">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{t("attendance.selectProject")}</CardTitle>
              </CardHeader>
              <CardContent>
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

          {/* Location Card with Map */}
          <Card variant="gradient" className="animate-fade-up stagger-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Your Location
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGetLocation}
                  disabled={isLocating}
                >
                  {isLocating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {locationError && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {locationError}
                </div>
              )}
              
              {location ? (
                <>
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-3 h-3 bg-success rounded-full" />
                      <div className="absolute inset-0 w-3 h-3 bg-success rounded-full animate-ping" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{location.address}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{t('attendance.locationVerifiedGPS')}</p>
                    </div>
                  </div>
                  
                  {/* Map Display */}
                  <div 
                    ref={mapContainerRef}
                    className="w-full h-48 rounded-lg overflow-hidden border border-border"
                    style={{ minHeight: '192px' }}
                  />
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <Navigation className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground text-sm mb-2">{t('attendance.locationNotCaptured')}</p>
                    <Button 
                      variant="outline" 
                      onClick={handleGetLocation}
                      disabled={isLocating}
                    >
                      {isLocating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Getting location...
                        </>
                      ) : (
                        <>
                          <Navigation className="w-4 h-4 mr-2" />
                          {t("attendance.getLocation")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Card - Show when checked in */}
          {isCheckedIn && (
            <Card variant="glow" className="animate-bounce-in">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-success/20">
                      <Check className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{t("attendance.checkIn")}</p>
                      <p className="text-xs text-muted-foreground">{t("attendance.checkInTime")} {checkInTime}</p>
                      {location && (
                        <p className="text-xs text-muted-foreground mt-1">{location.address}</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status="success" label={t("status.active")} pulse />
                </div>
              </CardContent>
            </Card>
          )}

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
                  className="w-full h-24 sm:h-32 flex-col gap-2 sm:gap-3"
                  onClick={handleCheckIn}
                  disabled={isLoading || !location || !selectedProject}
                >
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 animate-spin" />
                  ) : (
                    <>
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary-foreground/10 flex items-center justify-center"
                      >
                        <MapPin className="w-6 h-6 sm:w-8 sm:h-8" />
                      </motion.div>
                      <span className="font-display text-base sm:text-xl">{t("attendance.checkIn")}</span>
                    </>
                  )}
                </Button>
              </motion.div>
            ) : (
              /* Checkout Button - Always visible when checked in */
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant="outline"
                  size="xl"
                  className="w-full h-24 sm:h-32 flex-col gap-2 sm:gap-3 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={handleCheckOut}
                  disabled={isLoading || !selectedProject}
                >
                  {isLoading ? (
                    <Loader2 className="w-8 h-8 sm:w-12 sm:h-12 animate-spin" />
                  ) : (
                    <>
                      <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                        <Check className="w-6 h-6 sm:w-8 sm:h-8" />
                      </div>
                      <span className="font-display text-base sm:text-xl">{t("attendance.checkOut")}</span>
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </motion.div>

        </div>
      </div>
    </MobileLayout>
  );
}
