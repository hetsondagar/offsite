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
  MapPin,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { projectsApi, Project } from "@/services/api/projects";
import { usersApi } from "@/services/api/users";
import { notificationsApi, ProjectInvitation } from "@/services/api/notifications";
import { contractorApi } from "@/services/api/contractor";
import { toast } from "sonner";
import { Search, X, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { getMapTilerKey } from "@/lib/config";
import { getCurrentPosition } from "@/lib/capacitor-geolocation";
import { Slider } from "@/components/ui/slider";
import * as maptiler from "@maptiler/sdk";
import "@maptiler/sdk/dist/maptiler-sdk.css";

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
  const [geoFenceRadius, setGeoFenceRadius] = useState<number>(200); // Default 200m
  const [createStep, setCreateStep] = useState<'details' | 'geofence'>('details');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [mapMarker, setMapMarker] = useState<any>(null);
  const [mapCircle, setMapCircle] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const MAPTILER_KEY = getMapTilerKey();
  const [locationSearch, setLocationSearch] = useState("");
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchResults, setLocationSearchResults] = useState<Array<{ label: string; coordinates: [number, number] }>>([]);
  const [engineerSearch, setEngineerSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [selectedEngineers, setSelectedEngineers] = useState<Array<{ offsiteId: string; name: string }>>([]);
  const [selectedManagers, setSelectedManagers] = useState<Array<{ offsiteId: string; name: string }>>([]);
  const [selectedContractor, setSelectedContractor] = useState<{ offsiteId: string; name: string; rating: number } | null>(null);
  const [selectedPurchaseManager, setSelectedPurchaseManager] = useState<{ offsiteId: string; name: string } | null>(null);
  const [contractors, setContractors] = useState<Array<{ offsiteId: string; name: string; rating: number }>>([]);
  const [isLoadingContractors, setIsLoadingContractors] = useState(false);
  const [purchaseManagerSearch, setPurchaseManagerSearch] = useState("");
  const [purchaseManagerSearchResults, setPurchaseManagerSearchResults] = useState<Array<{ offsiteId: string; name: string }>>([]);
  const [isSearchingPurchaseManager, setIsSearchingPurchaseManager] = useState(false);
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
      if (mapInstance && typeof mapInstance.remove === 'function') {
        try {
          mapInstance.remove();
        } catch (error) {
          console.warn('Error removing map instance:', error);
        }
      }
    };
  }, []);

  // Cleanup map when dialog closes
  useEffect(() => {
    if (!isCreateDialogOpen && mapInstance) {
      if (typeof mapInstance.remove === 'function') {
        try {
          mapInstance.remove();
        } catch (error) {
          console.warn('Error removing map instance:', error);
        }
      }
      setMapInstance(null);
      setMapMarker(null);
      setMapCircle(null);
      setMapLoaded(false);
      setCreateStep('details');
      setGeoFenceCenter(null);
      setGeoFenceRadius(200);
      setLocationSearch("");
      setLocationSearchResults([]);
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

  // Load contractors when dialog opens
  useEffect(() => {
    if (isCreateDialogOpen && role === 'owner') {
      loadContractors();
    }
  }, [isCreateDialogOpen, role]);

  const loadContractors = async () => {
    try {
      setIsLoadingContractors(true);
      const data = await contractorApi.getContractors();
      const contractorsList = (data || []).map((c: any) => ({
        offsiteId: c.userId?.offsiteId || '',
        name: c.userId?.name || 'Unknown',
        rating: c.rating || 0,
      }));
      setContractors(contractorsList);
    } catch (error) {
      console.error('Error loading contractors:', error);
      toast.error('Failed to load contractors');
    } finally {
      setIsLoadingContractors(false);
    }
  };

  const handleSearchPurchaseManager = async (offsiteId: string) => {
    const trimmedId = offsiteId.trim().toUpperCase();
    
    if (!trimmedId || trimmedId.length < 6) {
      setPurchaseManagerSearchResults([]);
      return;
    }

    setIsSearchingPurchaseManager(true);
    
    try {
      const user = await usersApi.searchByOffsiteId(trimmedId);
      
      if (user.role !== 'purchase_manager') {
        toast.error(`This OffSite ID belongs to a ${user.role}, not a purchase manager`);
        setPurchaseManagerSearchResults([]);
        return;
      }

      setPurchaseManagerSearchResults([{
        offsiteId: user.offsiteId,
        name: user.name,
      }]);
    } catch (error: any) {
      console.error('Error searching purchase manager:', error);
      toast.error(error.message || 'Purchase manager not found');
      setPurchaseManagerSearchResults([]);
    } finally {
      setIsSearchingPurchaseManager(false);
    }
  };

  const handleSelectPurchaseManager = (user: { offsiteId: string; name: string }) => {
    setSelectedPurchaseManager(user);
    setPurchaseManagerSearch("");
    setPurchaseManagerSearchResults([]);
  };

  const handleDetailsNext = () => {
    if (!newProject.name || !newProject.location || !newProject.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!selectedContractor) {
      toast.error('Please select a contractor');
      return;
    }
    if (!selectedPurchaseManager) {
      toast.error('Please select a purchase manager');
      return;
    }
    setCreateStep('geofence');
    // Initialize map when moving to geo-fence step
    setTimeout(() => initializeGeoFenceMap(), 100);
  };

  const initializeGeoFenceMap = async (centerLat?: number, centerLon?: number) => {
    if (!mapContainerRef.current || mapInstance) return;

    try {
      // Use provided center or default location
      let initialLat = centerLat ?? 19.0760; // Default: Mumbai
      let initialLon = centerLon ?? 72.8777;

      // Configure MapTiler API key
      maptiler.config.apiKey = MAPTILER_KEY;

      // Calculate appropriate zoom based on radius (50m to 5km range)
      const radiusKm = geoFenceRadius / 1000;
      let initialZoom = 16;
      if (radiusKm >= 5) initialZoom = 12;
      else if (radiusKm >= 2) initialZoom = 13;
      else if (radiusKm >= 1) initialZoom = 14;
      else if (radiusKm >= 0.5) initialZoom = 15;
      else if (radiusKm >= 0.2) initialZoom = 16;
      else initialZoom = 17; // For very small radii (50-200m)

      const map = new maptiler.Map({
        container: mapContainerRef.current,
        style: 'https://api.maptiler.com/maps/streets-v2/style.json?key=' + MAPTILER_KEY,
        center: [initialLon, initialLat],
        zoom: initialZoom,
      });

      map.on('load', () => {
        setMapLoaded(true);
        // If we have a center already, show it
        if (geoFenceCenter) {
          updateMapMarker(map, geoFenceCenter.latitude, geoFenceCenter.longitude);
          updateMapCircle(map, geoFenceCenter.latitude, geoFenceCenter.longitude, geoFenceRadius);
        }
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

  const handleUseCurrentLocation = async () => {
    try {
      setIsSearchingLocation(true);
      const position = await getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const lat = position.latitude;
      const lng = position.longitude;
      
      setGeoFenceCenter({ latitude: lat, longitude: lng });
      
      // If map is already initialized, update it
      if (mapInstance && mapLoaded) {
        updateMapMarker(mapInstance, lat, lng);
        updateMapCircle(mapInstance, lat, lng, geoFenceRadius);
        // Adjust zoom based on radius (50m to 5km range)
        const radiusKm = geoFenceRadius / 1000;
        let zoom = 16;
        if (radiusKm >= 5) zoom = 12;
        else if (radiusKm >= 2) zoom = 13;
        else if (radiusKm >= 1) zoom = 14;
        else if (radiusKm >= 0.5) zoom = 15;
        else if (radiusKm >= 0.2) zoom = 16;
        else zoom = 17; // For very small radii (50-200m)
        mapInstance.flyTo({ center: [lng, lat], zoom, duration: 1000 });
      } else {
        // Initialize map with current location
        await initializeGeoFenceMap(lat, lng);
        setGeoFenceCenter({ latitude: lat, longitude: lng });
      }
      
      toast.success('Current location set');
    } catch (error: any) {
      console.error('Error getting current location:', error);
      toast.error('Failed to get current location. Please enable location permissions.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSearchLocation = async (query: string) => {
    if (!query.trim()) {
      setLocationSearchResults([]);
      return;
    }

    try {
      setIsSearchingLocation(true);
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://api.maptiler.com/geocoding/${encodedQuery}.json?key=${MAPTILER_KEY}&limit=5`
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const results = data.features.map((feature: any) => ({
          label: feature.properties?.label || feature.place_name || 'Unknown location',
          coordinates: feature.geometry.coordinates as [number, number],
        }));
        setLocationSearchResults(results);
      } else {
        setLocationSearchResults([]);
        toast.error('No locations found');
      }
    } catch (error: any) {
      console.error('Error searching location:', error);
      toast.error('Failed to search location');
      setLocationSearchResults([]);
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handleSelectLocation = (coordinates: [number, number], label: string) => {
    const [lng, lat] = coordinates;
    setGeoFenceCenter({ latitude: lat, longitude: lng });
    setLocationSearch("");
    setLocationSearchResults([]);
    
    // If map is already initialized, update it
    if (mapInstance && mapLoaded) {
      updateMapMarker(mapInstance, lat, lng);
      updateMapCircle(mapInstance, lat, lng, geoFenceRadius);
      // Adjust zoom based on radius (50m to 5km range)
      const radiusKm = geoFenceRadius / 1000;
      let zoom = 16;
      if (radiusKm >= 5) zoom = 12;
      else if (radiusKm >= 2) zoom = 13;
      else if (radiusKm >= 1) zoom = 14;
      else if (radiusKm >= 0.5) zoom = 15;
      else if (radiusKm >= 0.2) zoom = 16;
      else zoom = 17; // For very small radii (50-200m)
      mapInstance.flyTo({ center: [lng, lat], zoom, duration: 1000 });
    } else {
      // Initialize map with selected location
      initializeGeoFenceMap(lat, lng);
      setGeoFenceCenter({ latitude: lat, longitude: lng });
    }
    
    toast.success(`Location set: ${label}`);
  };

  const updateMapMarker = (map: any, lat: number, lng: number) => {
    if (mapMarker && typeof mapMarker.remove === 'function') {
      try {
        mapMarker.remove();
      } catch (error) {
        console.warn('Error removing map marker:', error);
      }
    }
    const marker = new maptiler.Marker({ color: '#3b82f6' })
      .setLngLat([lng, lat])
      .addTo(map);
    setMapMarker(marker);
  };

  const updateMapCircle = (map: any, lat: number, lng: number, radius: number) => {
    // Ensure radius is at least 50m (minimum allowed)
    if (radius < 50) {
      radius = 50;
    }

    // Note: mapCircle is a boolean flag, not an object with remove() method
    // The circle is managed through map layers/sources
    // Create circle using GeoJSON (MapTiler doesn't have built-in circle, use polygon approximation)
    // Use more points for larger circles to ensure smooth appearance
    const points = radius > 10000 ? 128 : 64;
    const circleCoords: [number, number][] = [];
    
    for (let i = 0; i <= points; i++) {
      const angle = (i * 360) / points;
      const dx = (radius / 111320) * Math.cos((angle * Math.PI) / 180);
      const dy = (radius / 111320) * Math.sin((angle * Math.PI) / 180);
      circleCoords.push([lng + dx, lat + dy]);
    }
    circleCoords.push(circleCoords[0]); // Close the polygon

    const geojsonData = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [circleCoords],
      },
    };

    if (map.getSource('geofence-circle')) {
      map.getSource('geofence-circle').setData(geojsonData);
    } else {
      map.addSource('geofence-circle', {
        type: 'geojson',
        data: geojsonData,
      });
      map.addLayer({
        id: 'geofence-circle',
        type: 'fill',
        source: 'geofence-circle',
        paint: {
          'fill-color': '#3b82f6',
          'fill-opacity': 0.25,
        },
      });
      map.addLayer({
        id: 'geofence-circle-border',
        type: 'line',
        source: 'geofence-circle',
        paint: {
          'line-color': '#3b82f6',
          'line-width': 3,
        },
      });
    }
    
    // Adjust zoom to fit the circle (50m to 5km range)
    const radiusKm = radius / 1000;
    let targetZoom = 16;
    if (radiusKm >= 5) targetZoom = 12;
    else if (radiusKm >= 2) targetZoom = 13;
    else if (radiusKm >= 1) targetZoom = 14;
    else if (radiusKm >= 0.5) targetZoom = 15;
    else if (radiusKm >= 0.2) targetZoom = 16;
    else targetZoom = 17; // For very small radii (50-200m)
    
    // Smoothly zoom to fit the circle
    const currentZoom = map.getZoom();
    if (Math.abs(currentZoom - targetZoom) > 1) {
      map.flyTo({ center: [lng, lat], zoom: targetZoom, duration: 500 });
    }
    
    setMapCircle(true);
  };

  useEffect(() => {
    if (geoFenceCenter && mapInstance && mapLoaded) {
      updateMapMarker(mapInstance, geoFenceCenter.latitude, geoFenceCenter.longitude);
      updateMapCircle(mapInstance, geoFenceCenter.latitude, geoFenceCenter.longitude, geoFenceRadius);
    }
  }, [geoFenceRadius, geoFenceCenter, mapInstance, mapLoaded]);

  // Note: Radius can be 50m to 5km

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.location || !newProject.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!selectedContractor) {
      toast.error('Please select a contractor');
      return;
    }

    if (!selectedPurchaseManager) {
      toast.error('Please select a purchase manager');
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
        contractorOffsiteId: selectedContractor.offsiteId,
        purchaseManagerOffsiteId: selectedPurchaseManager.offsiteId,
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
      setSelectedContractor(null);
      setSelectedPurchaseManager(null);
      setEngineerSearch("");
      setManagerSearch("");
      setPurchaseManagerSearch("");
      setGeoFenceCenter(null);
      setGeoFenceRadius(200);
      setCreateStep('details');
      setLocationSearch("");
      setLocationSearchResults([]);
      if (mapInstance) {
        if (typeof mapInstance.remove === 'function') {
          try {
            mapInstance.remove();
          } catch (error) {
            console.warn('Error removing map instance:', error);
          }
        }
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
                  {invitations.map((inv: any) => {
                    const projectObj = inv?.projectId && typeof inv.projectId === 'object' ? inv.projectId : null;
                    const projectName = projectObj?.name || 'Project';
                    const projectLocation = projectObj?.location;

                    return (
                      <div
                        key={inv._id}
                        className="rounded-lg border border-border/50 bg-background/40 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium text-sm text-foreground truncate">
                              {projectName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('projects.invitedAs')} {inv.role === 'engineer' ? t('auth.engineer') : t('auth.manager')}
                            </p>
                            {projectLocation && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{projectLocation}</span>
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
                    );
                  })}
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
            projects.filter(Boolean).map((project, index) => (
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
                          <p className="text-xs text-muted-foreground">{project.location || ''}</p>
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

                {/* Contractor Section - Required */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground">
                    Contractor <span className="text-destructive">*</span>
                  </Label>
                  {isLoadingContractors ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">Loading contractors...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {contractors.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No contractors available. Please create contractors first.</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                          {contractors.map((contractor) => (
                            <div
                              key={contractor.offsiteId}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors",
                                selectedContractor?.offsiteId === contractor.offsiteId
                                  ? "bg-primary/10 border-primary"
                                  : "bg-background border-border hover:bg-muted"
                              )}
                              onClick={() => setSelectedContractor(contractor)}
                            >
                              <div className="flex-1">
                                <p className="text-sm font-medium">{contractor.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground font-mono">{contractor.offsiteId}</p>
                                  {contractor.rating > 0 && (
                                    <div className="flex items-center gap-1">
                                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                      <span className="text-xs font-medium">{contractor.rating.toFixed(1)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {selectedContractor?.offsiteId === contractor.offsiteId && (
                                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                  <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedContractor && (
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{selectedContractor.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-xs text-muted-foreground font-mono">{selectedContractor.offsiteId}</p>
                                {selectedContractor.rating > 0 && (
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs font-medium">{selectedContractor.rating.toFixed(1)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedContractor(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Purchase Manager Section - Required */}
                <div className="space-y-2.5">
                  <Label className="text-sm font-medium text-foreground">
                    Purchase Manager <span className="text-destructive">*</span>
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by OffSite ID (e.g., OSPR0001)"
                        value={purchaseManagerSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPurchaseManagerSearch(value);
                          if (value.trim().length === 0) {
                            setPurchaseManagerSearchResults([]);
                            return;
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && purchaseManagerSearch.trim().length > 0) {
                            handleSearchPurchaseManager(purchaseManagerSearch);
                          }
                        }}
                        className="bg-background text-foreground pl-10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleSearchPurchaseManager(purchaseManagerSearch)}
                      disabled={!purchaseManagerSearch.trim() || isSearchingPurchaseManager}
                    >
                      {isSearchingPurchaseManager ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  
                  {/* Search Results */}
                  {purchaseManagerSearchResults.length > 0 && purchaseManagerSearch && (
                    <div className="mt-2 p-2 bg-muted rounded-lg border border-border">
                      {purchaseManagerSearchResults.map((user) => (
                        <div key={user.offsiteId} className="flex items-center justify-between p-2 hover:bg-background rounded">
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{user.offsiteId}</p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectPurchaseManager(user)}
                          >
                            <UserPlus className="w-4 h-4 mr-1" />
                            Select
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected Purchase Manager */}
                  {selectedPurchaseManager && (
                    <div className="mt-2 p-2 bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{selectedPurchaseManager.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{selectedPurchaseManager.offsiteId}</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSelectedPurchaseManager(null);
                            setPurchaseManagerSearch("");
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Set the project site location and geo-fence radius. You can use your current location or search for an address.
                      </p>
                      
                      {/* Location Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Location
                        </Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleUseCurrentLocation}
                            disabled={isSearchingLocation}
                            className="flex-1"
                          >
                            {isSearchingLocation ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Getting location...
                              </>
                            ) : (
                              <>
                                <MapPin className="w-4 h-4 mr-2" />
                                Use Current Location
                              </>
                            )}
                          </Button>
                        </div>
                        
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            placeholder="Search for location (e.g., address, city)"
                            value={locationSearch}
                            onChange={(e) => {
                              const value = e.target.value;
                              setLocationSearch(value);
                              if (value.trim().length > 2) {
                                handleSearchLocation(value);
                              } else {
                                setLocationSearchResults([]);
                              }
                            }}
                            className="bg-background text-foreground pl-10"
                          />
                        </div>
                        
                        {/* Location Search Results */}
                        {locationSearchResults.length > 0 && (
                          <div className="mt-2 p-2 bg-muted rounded-lg border border-border max-h-40 overflow-y-auto">
                            {locationSearchResults.map((result, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 hover:bg-background rounded cursor-pointer"
                                onClick={() => handleSelectLocation(result.coordinates, result.label)}
                              >
                                <p className="text-sm">{result.label}</p>
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Map Container */}
                      <div className="relative w-full h-64 rounded-lg overflow-hidden border border-border">
                        <div ref={mapContainerRef} className="w-full h-full" />
                        {!mapLoaded && (
                          <div className="absolute inset-0 flex items-center justify-center bg-muted">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                          </div>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        Click on the map to set the project site center, or use the location options above.
                      </p>

                      {/* Radius Selector */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">
                          Geo-fence Radius: {geoFenceRadius < 1000 ? `${geoFenceRadius} m` : (geoFenceRadius / 1000).toFixed(2) + ' km'}
                        </Label>
                        <Slider
                          value={[geoFenceRadius]}
                          onValueChange={(vals) => {
                            const newRadius = vals[0];
                            setGeoFenceRadius(newRadius);
                            // Update circle if center is already set
                            if (geoFenceCenter && mapInstance && mapLoaded) {
                              updateMapCircle(mapInstance, geoFenceCenter.latitude, geoFenceCenter.longitude, newRadius);
                            }
                          }}
                          min={50}
                          max={5000}
                          step={50}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>50 m</span>
                          <span>5 km</span>
                        </div>
                      </div>

                      {geoFenceCenter && (
                        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                          <p className="text-sm font-medium text-foreground">✓ Site Location Set</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Lat: {geoFenceCenter.latitude.toFixed(6)}, Lng: {geoFenceCenter.longitude.toFixed(6)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Radius: {geoFenceRadius < 1000 ? `${geoFenceRadius} m` : (geoFenceRadius / 1000).toFixed(2) + ' km'} (with {20}m buffer)
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
                      disabled={!newProject.name || !newProject.location || !newProject.startDate || !selectedContractor || !selectedPurchaseManager}
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
                        setLocationSearch("");
                        setLocationSearchResults([]);
                        if (mapInstance) {
                          if (typeof mapInstance.remove === 'function') {
                            try {
                              mapInstance.remove();
                            } catch (error) {
                              console.warn('Error removing map instance:', error);
                            }
                          }
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
