import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { HealthScoreRing } from "@/components/common/HealthScoreRing";
import { useAppSelector } from "@/store/hooks";
import { 
  ArrowLeft, 
  Building2,
  Users,
  Calendar,
  MapPin,
  CheckCircle2,
  Clock,
  PlayCircle,
  FileText,
  Package,
  UserCheck,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Plus,
  Search,
  X,
  UserPlus,
} from "lucide-react";
import { projectsApi } from "@/services/api/projects";
import { usersApi } from "@/services/api/users";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role } = useAppSelector((state) => state.auth);
  const [isLoading, setIsLoading] = useState(true);
  const [projectData, setProjectData] = useState<any>(null);
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false);
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [engineerSearch, setEngineerSearch] = useState("");
  const [managerSearch, setManagerSearch] = useState("");
  const [selectedEngineers, setSelectedEngineers] = useState<Array<{ offsiteId: string; name: string }>>([]);
  const [selectedManagers, setSelectedManagers] = useState<Array<{ offsiteId: string; name: string }>>([]);
  const [searchResults, setSearchResults] = useState<Array<{ offsiteId: string; name: string; role: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
  const [isDPRModalOpen, setIsDPRModalOpen] = useState(false);
  const [selectedDPR, setSelectedDPR] = useState<any>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (id) {
      loadProjectDetails();
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [id]);

  const loadProjectDetails = async () => {
    try {
      setIsLoading(true);
      const data = await projectsApi.getById(id!);
      setProjectData(data);
    } catch (error: any) {
      console.error('Error loading project details:', error);
      toast.error(error?.message || 'Failed to load project details');
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchUser = async (offsiteId: string, type: 'engineer' | 'manager', showErrorToast: boolean = false) => {
    const trimmedId = offsiteId.trim().toUpperCase();
    
    if (!trimmedId || trimmedId.length === 0) {
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
        toast.error('This user is already added');
        setSearchResults([]);
        return;
      }

      // Check if already a member
      if (projectData?.project?.members?.some((m: any) => m.offsiteId?.toUpperCase() === user.offsiteId.toUpperCase())) {
        toast.error('This user is already a member of this project');
        setSearchResults([]);
        return;
      }

      setSearchResults([{
        offsiteId: user.offsiteId,
        name: user.name,
        role: user.role,
      }]);
    } catch (error: any) {
      console.error('Error searching user:', error);
      // Only show error toast if explicitly requested (button click or Enter key)
      if (showErrorToast && trimmedId.length > 0) {
        toast.error(error.message || 'User not found');
      }
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddEngineer = (user: { offsiteId: string; name: string }) => {
    if (!selectedEngineers.some(e => e.offsiteId === user.offsiteId)) {
      setSelectedEngineers([...selectedEngineers, user]);
      setEngineerSearch("");
      setSearchResults([]);
    }
  };

  const handleAddManager = (user: { offsiteId: string; name: string }) => {
    if (!selectedManagers.some(m => m.offsiteId === user.offsiteId)) {
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

  const handleAddMembers = async () => {
    if (selectedEngineers.length === 0 && selectedManagers.length === 0) {
      toast.error('Please select at least one member to add');
      return;
    }

    setIsAddingMembers(true);
    try {
      await projectsApi.addMembers(id!, {
        engineerOffsiteIds: selectedEngineers.map(e => e.offsiteId),
        managerOffsiteIds: selectedManagers.map(m => m.offsiteId),
      });
      
      toast.success('Invitations sent successfully!');
      setIsAddMemberDialogOpen(false);
      setSelectedEngineers([]);
      setSelectedManagers([]);
      setEngineerSearch("");
      setManagerSearch("");
      setSearchResults([]);
      
      // Reload project details
      await loadProjectDetails();
    } catch (error: any) {
      console.error('Error adding members:', error);
      toast.error(error.message || 'Failed to add members');
    } finally {
      setIsAddingMembers(false);
    }
  };

  if (isLoading) {
    return (
      <MobileLayout role={role}>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!projectData) {
    return (
      <MobileLayout role={role}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('projects.projectNotFound')}</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            {t('projects.backToProjects')}
          </Button>
        </div>
      </MobileLayout>
    );
  }

  // Safely destructure project data
  const project = projectData?.project || projectData;
  const statistics = projectData?.statistics || {
    tasks: { total: 0, byStatus: { pending: 0, 'in-progress': 0, completed: 0 }, recent: [] },
    dprs: { total: 0, recent: [] },
    materials: { total: 0, byStatus: { pending: 0, approved: 0, rejected: 0 }, recent: [] },
    attendance: { total: 0, todayCheckIns: 0, recent: [] },
    events: { total: 0 },
  };

  // Additional check to ensure project has required fields
  if (!project || !project.name) {
    return (
      <MobileLayout role={role}>
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t('projects.invalidProjectData')}</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            {t('projects.backToProjects')}
          </Button>
        </div>
      </MobileLayout>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusLabel = (status: string | undefined): string => {
    const statusMap: Record<string, string> = {
      'active': 'Active',
      'planning': 'Planning',
      'on-hold': 'On Hold',
      'completed': 'Completed',
      'pending': 'Pending',
      'in-progress': 'In Progress',
      'approved': 'Approved',
      'rejected': 'Rejected',
    };
    return statusMap[status || 'planning'] || (status || 'Planning');
  };

  const getRoleLabel = (role: string | undefined): string => {
    const roleMap: Record<string, string> = {
      'engineer': 'Site Engineer',
      'manager': 'Project Manager',
      'owner': 'Project Owner',
    };
    return roleMap[role || 'engineer'] || (role || 'Engineer');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      'in-progress': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      completed: 'bg-green-500/10 text-green-600 border-green-500/20',
      approved: 'bg-green-500/10 text-green-600 border-green-500/20',
      rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
      active: 'bg-green-500/10 text-green-600 border-green-500/20',
      'on-hold': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
      planning: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    };
    return colors[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';
  };

  return (
    <MobileLayout role={role}>
      <div className="space-y-4 sm:space-y-6 pb-6 w-full overflow-x-hidden max-w-full px-3 sm:px-4">
        {/* Header */}
        <div className="flex items-center gap-3 sm:gap-4 w-full overflow-x-hidden pt-3 sm:pt-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/projects')}
            className="shrink-0"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
          <div className="flex-1 min-w-0 overflow-hidden">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold truncate">{project.name}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{project.location}</p>
          </div>
        </div>

        {/* Project Overview */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Status and Health Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusBadge status={(project.status as any) || 'planning'} label={getStatusLabel(project.status)} />
                </div>
                <div className="flex items-center gap-2">
                  <HealthScoreRing score={typeof project.healthScore === 'number' ? project.healthScore : 0} size="md" />
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress || 0}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${project.progress || 0}%` }}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-2 w-full max-w-full">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Start Date</span>
                  </div>
                  <p className="font-medium">{project.startDate ? formatDate(project.startDate) : 'N/A'}</p>
                </div>
                {project.endDate && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>End Date</span>
                    </div>
                    <p className="font-medium">{formatDate(project.endDate)}</p>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="flex items-start gap-2 pt-2 border-t">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">{project.location || 'No location specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full max-w-full">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="w-4 h-4" />
                  <span className="text-xs">Tasks</span>
                </div>
                <p className="text-2xl font-bold">{statistics.tasks.total}</p>
                <div className="flex gap-1 text-xs">
                  <span className={cn("px-1.5 py-0.5 rounded", getStatusColor('pending'))}>
                    {statistics.tasks.byStatus.pending} Pending
                  </span>
                  <span className={cn("px-1.5 py-0.5 rounded", getStatusColor('in-progress'))}>
                    {statistics.tasks.byStatus['in-progress']} Active
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-xs">DPRs</span>
                </div>
                <p className="text-2xl font-bold">{statistics.dprs.total}</p>
                <p className="text-xs text-muted-foreground">{t('projects.dailyReports')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Package className="w-4 h-4" />
                  <span className="text-xs">Materials</span>
                </div>
                <p className="text-2xl font-bold">{statistics.materials.total}</p>
                <div className="flex gap-1 text-xs">
                  <span className={cn("px-1.5 py-0.5 rounded", getStatusColor('pending'))}>
                    {statistics.materials.byStatus.pending} Pending
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <UserCheck className="w-4 h-4" />
                  <span className="text-xs">Attendance</span>
                </div>
                <p className="text-2xl font-bold">{statistics.attendance.todayCheckIns}</p>
                <p className="text-xs text-muted-foreground">{t('projects.checkedInToday')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Team Members */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Team Members
              </CardTitle>
              {role === "owner" && (
                <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-1" />
                      Add Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px] bg-card text-foreground max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-foreground">Add Team Members</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      {/* Site Engineers Section */}
                      <div className="space-y-2">
                        <Label>Site Engineers (Optional)</Label>
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
                      <div className="space-y-2">
                        <Label>Project Managers (Optional)</Label>
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
                    </div>
                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddMemberDialogOpen(false)}
                        className="flex-1"
                        disabled={isAddingMembers}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleAddMembers}
                        className="flex-1"
                        disabled={isAddingMembers || (selectedEngineers.length === 0 && selectedManagers.length === 0)}
                      >
                        {isAddingMembers ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Members
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {project.members && project.members.length > 0 ? (
              <div className="space-y-3">
                {project.members.map((member: any) => (
                  <div key={member._id || member.offsiteId} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{member.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{member.offsiteId}</span>
                        <StatusBadge status={(member.role as any)} label={getRoleLabel(member.role)} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">{t('projects.noMembersAssigned')}</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Tasks */}
        {statistics.tasks.recent && statistics.tasks.recent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recent Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.tasks.recent.map((task: any) => (
                  <div key={task._id} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{task.title}</p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {task.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {task.assignedTo && (
                            <span>{t('projects.assignedTo')} {task.assignedTo.name}</span>
                          )}
                          {task.dueDate && (
                            <span>Due: {formatDate(task.dueDate)}</span>
                          )}
                        </div>
                      </div>
                      <span className={cn("px-2 py-1 rounded text-xs border shrink-0", getStatusColor(task.status))}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent DPRs */}
        {statistics.dprs.recent && statistics.dprs.recent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Recent DPRs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.dprs.recent.map((dpr: any) => (
                  <div 
                    key={dpr._id} 
                    className="p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => {
                      setSelectedDPR(dpr);
                      setIsDPRModalOpen(true);
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">
                          {dpr.taskId?.title || 'Task'}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>By: {dpr.createdBy?.name || 'Unknown'}</span>
                          <span>{formatDate(dpr.createdAt)}</span>
                        </div>
                        {dpr.photos && dpr.photos.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <ImageIcon className="w-3 h-3" />
                            <span>{dpr.photos.length} photo(s)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Material Requests */}
        {statistics.materials.recent && statistics.materials.recent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Recent Material Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.materials.recent.map((material: any) => (
                  <div key={material._id} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{material.materialName}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {material.quantity} {material.unit}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>By: {material.requestedBy?.name || 'Unknown'}</span>
                          <span>{formatDate(material.createdAt)}</span>
                        </div>
                      </div>
                      <span className={cn("px-2 py-1 rounded text-xs border shrink-0", getStatusColor(material.status))}>
                        {material.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Attendance */}
        {statistics.attendance.recent && statistics.attendance.recent.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Recent Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {statistics.attendance.recent.slice(0, 5).map((attendance: any) => (
                  <div key={attendance._id} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{attendance.userId?.name || 'Unknown'}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded",
                            attendance.type === 'checkin' 
                              ? 'bg-green-500/10 text-green-600' 
                              : 'bg-blue-500/10 text-blue-600'
                          )}>
                            {attendance.type === 'checkin' ? 'Check-in' : 'Check-out'}
                          </span>
                          <span>{new Date(attendance.timestamp).toLocaleString()}</span>
                        </div>
                        {attendance.location && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {attendance.location}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
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
                  <span className="text-xs text-muted-foreground">Task</span>
                  <p className="font-medium text-foreground">{selectedDPR.taskId?.title || 'Unknown Task'}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground">Created By</span>
                  <p className="font-medium text-foreground">{selectedDPR.createdBy?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDate(selectedDPR.createdAt)}
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

