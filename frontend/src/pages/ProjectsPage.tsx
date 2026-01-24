import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { HealthScoreRing } from "@/components/common/HealthScoreRing";
import { Logo } from "@/components/common/Logo";
import { useAppSelector } from "@/store/hooks";
import { 
  ArrowLeft, 
  Building2,
  Users,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Loader2,
  Plus,
  MapPin
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { projectsApi, Project } from "@/services/api/projects";
import { usersApi } from "@/services/api/users";
import { notificationsApi, ProjectInvitation } from "@/services/api/notifications";
import { toast } from "sonner";
import { Search, X, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { getMapTilerKey } from "@/lib/config";
import { getCurrentPosition } from "@/lib/capacitor-geolocation";
import { Slider } from "@/components/ui/slider";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role } = useAppSelector((state) => state.auth);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [isInvitationsLoading, setIsInvitationsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: "",
  });
  const [geoFenceCenter, setGeoFenceCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geoFenceRadius, setGeoFenceRadius] = useState<number>(200);
  const [createStep, setCreateStep] = useState<'details' | 'geofence'>('details');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapMarker, setMapMarker] = useState<any>(null);
  const [mapCircle, setMapCircle] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const MAPTILER_KEY = getMapTilerKey();
  const [engineerSearch, setEngineerSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [selectedEngineers, setSelectedEngineers] = useState<Array<{ offsiteId: string; name: string }>>([]);
  const [selectedManagers, setSelectedManagers] = useState<Array<{ offsiteId: string; name: string }>>([]);
  const [searchResults, setSearchResults] = useState<Array<{ offsiteId: string; name: string; role: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadProjects();
    loadInvitations();
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (mapInstance) {
        mapInstance.remove();
      }
    };
  }, []);

  // Cleanup map when dialog closes
  useEffect(() => {
    if (!isCreateDialogOpen && mapInstance) {
      mapInstance.remove();
      setMapInstance(null);
      setMapMarker(null);
      setMapCircle(null);
      setMapLoaded(false);
      setCreateStep('details');
      setGeoFenceCenter(null);
      setGeoFenceRadius(200);
    }
  }, [isCreateDialogOpen]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectsApi.getAll(1, 100);
      setProjects(data?.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error(t('projects.failedToLoadProjects'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadInvitations = async () => {
    try {
      setIsInvitationsLoading(true);
      const data = await notificationsApi.getMyInvitations();
      setInvitations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      setInvitations([]);
    } finally {
      setIsInvitationsLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.acceptInvitation(invitationId);
      toast.success(t('projects.invitationAcceptedAdded'));
      await Promise.all([loadInvitations(), loadProjects()]);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.rejectInvitation(invitationId);
      toast.success(t('messages.invitationRejected'));
      await loadInvitations();
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      toast.error(error.message || 'Failed to reject invitation');
    }
  };

  const handleSearchUser = async (offsiteId: string, type: 'engineer' | 'manager', showErrorToast: boolean = false) => {
    const trimmedId = offsiteId.trim().toUpperCase();
    
    if (!trimmedId || trimmedId.length === 0) {
      setSearchResults([]);
      setLastSearchQuery('');
      return;
    }

    // Minimum length check: OffSite IDs are at least 8 characters (OS + 2 role + 4 digits)
    // But allow search from 6 characters to catch partial matches
    if (trimmedId.length < 6) {
      setSearchResults([]);
      setLastSearchQuery('');
      return;
    }

    // Don't search if it's the same query
    if (trimmedId === lastSearchQuery) {
      return;
    }

    setIsSearching(true);
    setLastSearchQuery(trimmedId);
    
    try {
      const user = await usersApi.searchByOffsiteId(trimmedId);
      
      // Check if user role matches the search type
      if ((type === 'engineer' && user.role !== 'engineer') || 
          (type === 'manager' && user.role !== 'manager')) {
        toast.error(`This OffSite ID belongs to a ${user.role}, not a ${type}`);
        setSearchResults([]);
        return;
      }

      // Check if already selected
      const isEngineerSelected = selectedEngineers.some(e => e.offsiteId.toUpperCase() === user.offsiteId.toUpperCase());
      const isManagerSelected = selectedManagers.some(m => m.offsiteId.toUpperCase() === user.offsiteId.toUpperCase());
      
      if (isEngineerSelected || isManagerSelected) {
        toast.error(t('projects.userAlreadyAdded'));
        setSearchResults([]);
        return;
      }

      setSearchResults([{
        offsiteId: user.offsiteId,
        name: user.name,
        role: user.role,
      }]);
    } catch (error: any) {
      // Only log errors when explicitly searching (Enter key or button click)
      // Suppress console errors for 404s during typing to avoid noise
      if (showErrorToast) {
        console.error('Error searching user:', error);
        toast.error(error.message || 'User not found');
      }
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddEngineer = (user: { offsiteId: string; name: string }) => {
    // Case-insensitive check to prevent duplicates
    if (!selectedEngineers.some(e => e.offsiteId.toUpperCase() === user.offsiteId.toUpperCase())) {
      setSelectedEngineers([...selectedEngineers, user]);
      setEngineerSearch("");
      setSearchResults([]);
    }
  };

  const handleAddManager = (user: { offsiteId: string; name: string }) => {
    // Case-insensitive check to prevent duplicates
    if (!selectedManagers.some(m => m.offsiteId.toUpperCase() === user.offsiteId.toUpperCase())) {
      setSelectedManagers([...selectedManagers, user]);
      setManagerSearch("");
      setSearchResults([]);
    }
  };

  const handleRemoveEngineer = (offsiteId: string) => {
    setSelectedEngineers(selectedEngineers.filter(e => e.offsiteId !== offsiteId));
  };

  const handleRemoveManager = (offsiteId: string) => {
    setSelectedManagers(selectedManagers.filter(m => m.offsiteId !== offsiteId));
  };

  const handleDetailsNext = () => {
    if (!newProject.name || !newProject.location || !newProject.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    setCreateStep('geofence');
    // Initialize map when moving to geo-fence step
    setTimeout(() => initializeGeoFenceMap(), 100);
  };

  const initializeGeoFenceMap = async () => {
    if (!mapContainerRef.current || mapInstance) return;

    try {
      // Try to get user's current location for initial map center
      let initialLat = 19.0760; // Default: Mumbai
      let initialLon = 72.8777;
      try {
        const position = await getCurrentPosition({ enableHighAccuracy: false, timeout: 5000 });
        initialLat = position.latitude;
        initialLon = position.longitude;
      } catch {
        // Use default if location unavailable
      }

      // Load MapTiler SDK if not already loaded
      if (!window.maptilerSdk && !window.maptiler) {
        // Use jsDelivr CDN which has better MIME type handling
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = `https://cdn.jsdelivr.net/npm/@maptiler/sdk@3.10.2/dist/maptiler-sdk.umd.js`;
        script.async = true;
        script.crossOrigin = 'anonymous';
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            // Wait a bit for the SDK to initialize on window
            setTimeout(() => {
              if (window.maptilerSdk || window.maptiler) {
                resolve();
              } else {
                reject(new Error('MapTiler SDK loaded but not available on window'));
              }
            }, 100);
          };
          script.onerror = (error) => {
            console.error('MapTiler SDK script load error:', error);
            reject(new Error('Failed to load MapTiler SDK script'));
          };
          document.head.appendChild(script);
        });

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/@maptiler/sdk@3.10.2/dist/maptiler-sdk.css';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }

      const maptiler = window.maptilerSdk || window.maptiler;
      if (!maptiler) {
        throw new Error('MapTiler SDK failed to load');
      }

      maptiler.config.apiKey = MAPTILER_KEY;

      const map = new maptiler.Map({
        container: mapContainerRef.current,
        style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=' + MAPTILER_KEY,
        center: [initialLon, initialLat],
        zoom: 15,
      });

      map.on('load', () => {
        setMapLoaded(true);
        // Add click handler to drop pin
        map.on('click', (e: any) => {
          const { lng, lat } = e.lngLat;
          setGeoFenceCenter({ latitude: lat, longitude: lng });
          updateMapMarker(map, lat, lng);
          updateMapCircle(map, lat, lng, geoFenceRadius);
        });
      });

      setMapInstance(map);
    } catch (error: any) {
      console.error('Failed to initialize map:', error);
      toast.error('Failed to load map. Please ensure you have internet connection.');
    }
  };

  const updateMapMarker = (map: any, lat: number, lng: number) => {
    if (mapMarker) mapMarker.remove();
    const maptiler = window.maptilerSdk || window.maptiler;
    const marker = new maptiler.Marker({ color: '#3b82f6' })
      .setLngLat([lng, lat])
      .addTo(map);
    setMapMarker(marker);
  };

  const updateMapCircle = (map: any, lat: number, lng: number, radius: number) => {
    if (mapCircle) mapCircle.remove();
    const maptiler = window.maptilerSdk || window.maptiler;
    // Create circle using GeoJSON (MapTiler doesn't have built-in circle, use polygon approximation)
    const points = 64;
    const circleCoords: [number, number][] = [];
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360) / points;
      const dx = (radius / 111320) * Math.cos((angle * Math.PI) / 180);
      const dy = (radius / 111320) * Math.sin((angle * Math.PI) / 180);
      circleCoords.push([lng + dx, lat + dy]);
    }
    circleCoords.push(circleCoords[0]); // Close the polygon

    if (map.getSource('geofence-circle')) {
      map.getSource('geofence-circle').setData({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [circleCoords],
        },
      });
    } else {
      map.addSource('geofence-circle', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [circleCoords],
          },
        },
      });
      map.addLayer({
        id: 'geofence-circle',
        type: 'fill',
        source: 'geofence-circle',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.2,
        },
      });
      map.addLayer({
        id: 'geofence-circle-border',
        type: 'line',
        source: 'geofence-circle',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 2,
        },
      });
    }
    setMapCircle(true);
  };

  useEffect(() => {
    if (geoFenceCenter && mapInstance && mapLoaded) {
      updateMapMarker(mapInstance, geoFenceCenter.latitude, geoFenceCenter.longitude);
      updateMapCircle(mapInstance, geoFenceCenter.latitude, geoFenceCenter.longitude, geoFenceRadius);
    }
  }, [geoFenceRadius, geoFenceCenter, mapInstance, mapLoaded]);

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.location || !newProject.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!geoFenceCenter) {
      toast.error('Please set the project site location on the map');
      return;
    }

    setIsCreating(true);
    try {
      const projectData = {
        name: newProject.name.trim(),
        location: newProject.location.trim(),
        startDate: new Date(newProject.startDate).toISOString(),
        endDate: newProject.endDate ? new Date(newProject.endDate).toISOString() : undefined,
        engineerOffsiteIds: selectedEngineers.map(e => e.offsiteId),
        managerOffsiteIds: selectedManagers.map(m => m.offsiteId),
        geoFence: {
          enabled: true,
          center: geoFenceCenter,
          radiusMeters: geoFenceRadius,
          bufferMeters: 20,
        },
      };

      await projectsApi.create(projectData);
      
      toast.success(t('projects.projectCreatedSuccess'));
      setIsCreateDialogOpen(false);
      setNewProject({
        name: "",
        location: "",
        startDate: "",
        endDate: "",
      });
      setSelectedEngineers([]);
      setSelectedManagers([]);
      setEngineerSearch("");
      setManagerSearch("");
      setGeoFenceCenter(null);
      setGeoFenceRadius(200);
      setCreateStep('details');
      if (mapInstance) {
        mapInstance.remove();
        setMapInstance(null);
        setMapMarker(null);
        setMapCircle(null);
        setMapLoaded(false);
      }
      
      // Reload projects
      await loadProjects();
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <MobileLayout role={role || "manager"}>
      <div className="bg-background w-full overflow-x-hidden min-h-screen max-w-full" style={{ maxWidth: '100vw' }}>
        <PageHeader
          title={t('projects.title')}
          subtitle={isLoading ? t('common.loading') : `${projects.length} ${projects.length !== 1 ? t('projects.activeProjectsPlural') : t('projects.activeProjects')}`}
          showBack={false}
        />

        {/* Content */}
        <div className="p-4 space-y-4 pb-6">
          {/* Pending invitations (managers/engineers won't see projects until accepted) */}
          {isInvitationsLoading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : invitations.length > 0 ? (
            <Card variant="gradient">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{t('projects.pendingInvitations')}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('projects.acceptToSeeProject')}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">{invitations.length}</span>
                </div>

                <div className="mt-3 space-y-3">
                  {invitations.map((inv) => (
                    <div
                      key={inv._id}
                      className="rounded-lg border border-border/50 bg-background/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {inv.projectId?.name || 'Project'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('projects.invitedAs')} {inv.role === 'engineer' ? t('auth.engineer') : t('auth.manager')}
                          </p>
                          {inv.projectId?.location && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{inv.projectId.location}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAcceptInvitation(inv._id)}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          {t('common.accept')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleRejectInvitation(inv._id)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          {t('common.reject')}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <Card variant="gradient">
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">{t('projects.noProjects')}</p>
                <p className="text-sm text-muted-foreground">
                  {role === 'owner'
                    ? t('projects.createFirstProject')
                    : t('projects.askOwnerToInvite')}
                </p>
              </CardContent>
            </Card>
          ) : (
            projects.map((project, index) => (
              <Card 
                key={project._id}
                variant="gradient"
                className={cn(
                  "cursor-pointer transition-all duration-300 opacity-0 animate-fade-up",
                  "hover:border-primary/30 hover:shadow-glow-sm",
                  selectedProject === project._id && "border-primary shadow-glow-md"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() => setSelectedProject(selectedProject === project._id ? null : project._id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <HealthScoreRing score={project.healthScore} size="sm" showLabel={false} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-semibold text-foreground truncate">
                            {project.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">{project.location}</p>
                        </div>
                        {/* Risk badge would come from insights API */}
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium text-foreground">{project.progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-1000"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Quick Stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs">
                        {project.members && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {project.members.length} members
                          </div>
                        )}
                        {project.endDate && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <TrendingUp className="w-3 h-3" />
                          {project.progress}% complete
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded View */}
                  {selectedProject === project._id && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-3 animate-fade-up">
                      <Button 
                        variant="outline" 
                        className="w-full justify-between"
                        onClick={() => navigate(`/projects/${project._id}`)}
                      >
                        View Project Details
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Floating Create Project Button - Only for Owners */}
        {role === "owner" && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="fixed bottom-24 right-6 w-14 h-14 rounded-full shadow-lg z-40 bg-primary hover:bg-primary/90 safe-area-bottom"
                size="icon"
              >
                <Plus className="w-6 h-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-card text-foreground max-h-[90vh] flex flex-col overflow-hidden rounded-2xl">
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="text-foreground">
                  {createStep === 'details' ? t('projects.createProject') : 'Set Site Location'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-5 py-4 overflow-y-auto flex-1 min-h-0 pr-2 -mr-2">
                {createStep === 'details' ? (
                  <>
                <div className="space-y-2.5">
                  <Label htmlFor="name" className="text-sm font-medium text-foreground">
                    {t('projects.projectName')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    placeholder="e.g., Riverside Apartments"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="location" className="text-sm font-medium text-foreground">
                    Location <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="location"
                      placeholder="e.g., 123 Main St, City, State"
                      value={newProject.location}
                      onChange={(e) => setNewProject({ ...newProject, location: e.target.value })}
                      className="bg-background text-foreground pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="startDate" className="text-sm font-medium text-foreground">
                    {t('projects.startDate')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    className="bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2.5">
                  <Label htmlFor="endDate" className="text-sm font-medium text-foreground">
                    End Date <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    className="bg-background text-foreground"
                    min={newProject.startDate}
                  />
                </div>

                {/* Site Engineers Section */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground">
                    {t('projects.siteEngineers')} <span className="text-muted-foreground text-xs font-normal">({t('projects.optional')})</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by OffSite ID (e.g., OSSE0001)"
                        value={engineerSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setEngineerSearch(value);
                          
                          // Clear previous timeout
                          if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                          }
                          
                          if (value.trim().length === 0) {
                            setSearchResults([]);
                            setLastSearchQuery('');
                            return;
                          }
                          
                          // Debounce search - only search after user stops typing for 500ms
                          // Don't show error toast for debounced searches
                          searchTimeoutRef.current = setTimeout(() => {
                            handleSearchUser(value, 'engineer', false);
                          }, 500);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && engineerSearch.trim().length > 0) {
                            // Clear timeout and search immediately on Enter
                            if (searchTimeoutRef.current) {
                              clearTimeout(searchTimeoutRef.current);
                            }
                            // Show error toast on explicit search (Enter key)
                            handleSearchUser(engineerSearch, 'engineer', true);
                          }
                        }}
                        className="bg-background text-foreground pl-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                        }
                        // Show error toast on explicit search (button click)
                        handleSearchUser(engineerSearch, 'engineer', true);
                      }}
                      disabled={!engineerSearch.trim() || isSearching}
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && engineerSearch && (
                    <div className="mt-2 p-2 bg-muted rounded-lg border border-border">
                      {searchResults.map((user) => (
                        <div key={user.offsiteId} className="flex items-center justify-between p-2 hover:bg-background rounded">
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{user.offsiteId}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddEngineer(user)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected Engineers */}
                  {selectedEngineers.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {selectedEngineers.map((engineer) => (
                        <div key={engineer.offsiteId} className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                          <div>
                            <p className="text-sm font-medium">{engineer.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{engineer.offsiteId}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveEngineer(engineer.offsiteId)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project Managers Section */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground">
                    {t('projects.projectManagers')} <span className="text-muted-foreground text-xs font-normal">({t('projects.optional')})</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by OffSite ID (e.g., OSPM0001)"
                        value={managerSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setManagerSearch(value);
                          
                          // Clear previous timeout
                          if (searchTimeoutRef.current) {
                            clearTimeout(searchTimeoutRef.current);
                          }
                          
                          if (value.trim().length === 0) {
                            setSearchResults([]);
                            setLastSearchQuery('');
                            return;
                          }
                          
                          // Debounce search - only search after user stops typing for 500ms
                          // Don't show error toast for debounced searches
                          searchTimeoutRef.current = setTimeout(() => {
                            handleSearchUser(value, 'manager', false);
                          }, 500);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && managerSearch.trim().length > 0) {
                            // Clear timeout and search immediately on Enter
                            if (searchTimeoutRef.current) {
                              clearTimeout(searchTimeoutRef.current);
                            }
                            // Show error toast on explicit search (Enter key)
                            handleSearchUser(managerSearch, 'manager', true);
                          }
                        }}
                        className="bg-background text-foreground pl-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current);
                        }
                        // Show error toast on explicit search (button click)
                        handleSearchUser(managerSearch, 'manager', true);
                      }}
                      disabled={!managerSearch.trim() || isSearching}
                    >
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && managerSearch && (
                    <div className="mt-2 p-2 bg-muted rounded-lg border border-border">
                      {searchResults.map((user) => (
                        <div key={user.offsiteId} className="flex items-center justify-between p-2 hover:bg-background rounded">
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{user.offsiteId}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleAddManager(user)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected Managers */}
                  {selectedManagers.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {selectedManagers.map((manager) => (
                        <div key={manager.offsiteId} className="flex items-center justify-between p-2 bg-primary/10 rounded-lg border border-primary/20">
                          <div>
                            <p className="text-sm font-medium">{manager.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{manager.offsiteId}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveManager(manager.offsiteId)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Click on the map to set the project site center. This defines the geo-fence for attendance.
                      </p>
                      
                      {/* Map Container */}
                      <div className="relative w-full h-64 rounded-lg overflow-hidden border border-border">
                        <div ref={mapContainerRef} className="w-full h-full" />
                        {!mapLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        )}
                      </div>

                      {/* Radius Selector */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Geo-fence Radius: {geoFenceRadius}m
                        </Label>
                        <Slider
                          value={[geoFenceRadius]}
                          onValueChange={(vals) => setGeoFenceRadius(vals[0])}
                          min={50}
                          max={500}
                          step={10}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>50m</span>
                          <span>500m</span>
                        </div>
                      </div>

                      {geoFenceCenter && (
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-sm font-medium text-foreground">Site Location Set</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Lat: {geoFenceCenter.latitude.toFixed(6)}, Lng: {geoFenceCenter.longitude.toFixed(6)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Radius: {geoFenceRadius}m (with {20}m buffer)
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <div className="flex gap-3 flex-shrink-0 pt-2 border-t border-border/50">
                {createStep === 'details' ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      className="flex-1"
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDetailsNext}
                      className="flex-1"
                      disabled={!newProject.name || !newProject.location || !newProject.startDate}
                    >
                      Next: Set Location
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCreateStep('details');
                        if (mapInstance) {
                          mapInstance.remove();
                          setMapInstance(null);
                          setMapMarker(null);
                          setMapCircle(null);
                          setMapLoaded(false);
                        }
                      }}
                      className="flex-1"
                      disabled={isCreating}
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleCreateProject}
                      className="flex-1"
                      disabled={isCreating || !geoFenceCenter}
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Create Project
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MobileLayout>
  );
}
