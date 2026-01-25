import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { useAppSelector } from "@/store/hooks";
import { 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  User as UserIcon,
  Building2,
  Filter,
  Loader2,
  Edit
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { tasksApi, Task } from "@/services/api/tasks";
import { projectsApi, Project } from "@/services/api/projects";
import { usersApi, User } from "@/services/api/users";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";

export default function TasksPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { role, userId } = useAppSelector((state) => state.auth);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [engineers, setEngineers] = useState<User[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [isSearchingEngineer, setIsSearchingEngineer] = useState(false);
  const [engineerSearch, setEngineerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const [newTask, setNewTask] = useState({
    projectId: "",
    title: "",
    description: "",
    assignedTo: "",
    dueDate: undefined as Date | undefined,
    plannedLabourCount: 0,
  });

  const canCreateTasks = role === "owner" || role === "manager";

  useEffect(() => {
    loadTasks();
    if (canCreateTasks) {
      loadProjects();
    }
  }, [role, selectedProject, selectedStatus]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const projectId = selectedProject === "all" ? undefined : selectedProject;
      const allTasks = await tasksApi.getAll(projectId);
      
      let filteredTasks = allTasks || [];
      
      // Apply status filter
      if (selectedStatus !== "all") {
        filteredTasks = filteredTasks.filter((task) => task.status === selectedStatus);
      }
      
      setTasks(filteredTasks);
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      toast.error(error?.message || 'Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll(1, 100);
      setProjects(data?.projects || []);
      if (data?.projects && data.projects.length > 0 && !newTask.projectId) {
        setNewTask(prev => ({ ...prev, projectId: data.projects[0]._id }));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error(t('tasks.failedToLoadProjects'));
    }
  };

  const handleSearchEngineer = async (offsiteId: string, showErrorToast: boolean = false) => {
    const trimmedId = offsiteId.trim().toUpperCase();
    
    if (!trimmedId || trimmedId.length === 0) {
      setSearchResults([]);
      setNewTask(prev => ({ ...prev, assignedTo: "" }));
      return;
    }

    // Minimum length check: OffSite IDs are at least 8 characters (OS + 2 role + 4 digits)
    // But allow search from 6 characters to catch partial matches
    if (trimmedId.length < 6) {
      setSearchResults([]);
      setNewTask(prev => ({ ...prev, assignedTo: "" }));
      return;
    }

    setIsSearchingEngineer(true);
    try {
      const user = await usersApi.searchByOffsiteId(trimmedId);
      if (user && user.role === 'engineer') {
        setSearchResults([user]);
        setNewTask(prev => ({ ...prev, assignedTo: user._id }));
      } else {
        setSearchResults([]);
        setNewTask(prev => ({ ...prev, assignedTo: "" }));
        if (showErrorToast) {
          toast.error(t('tasks.userNotFoundOrNotEngineer'));
        }
      }
    } catch (error: any) {
      // Only log errors when explicitly searching (Enter key or button click)
      // Suppress console errors for 404s during typing to avoid noise
      if (showErrorToast) {
        console.error('Error searching engineer:', error);
        toast.error(error?.message || 'Failed to search engineer');
      }
      setSearchResults([]);
      setNewTask(prev => ({ ...prev, assignedTo: "" }));
    } finally {
      setIsSearchingEngineer(false);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.projectId || !newTask.title.trim()) {
      toast.error("Please fill all required fields.");
      return;
    }

    setIsCreating(true);
    try {
      const taskData = {
        projectId: newTask.projectId,
        title: newTask.title.trim(),
        description: newTask.description.trim() || undefined,
        assignedTo: newTask.assignedTo || undefined,
        dueDate: newTask.dueDate ? newTask.dueDate.toISOString() : undefined,
        plannedLabourCount: newTask.plannedLabourCount > 0 ? newTask.plannedLabourCount : undefined,
      };

      await tasksApi.create(taskData);
      toast.success(t('tasks.taskCreated'));
      setIsCreateDialogOpen(false);
      resetNewTask();
      loadTasks();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error?.message || 'Failed to create task');
    } finally {
      setIsCreating(false);
    }
  };

  const resetNewTask = () => {
    setNewTask({
      projectId: projects.length > 0 ? projects[0]._id : "",
      title: "",
      description: "",
      assignedTo: "",
      dueDate: undefined,
      plannedLabourCount: 0,
    });
    setEngineerSearch("");
    setSearchResults([]);
  };

  const handleUpdateStatus = async (taskId: string, currentStatus: Task['status']) => {
    try {
      let newStatus: Task['status'];
      if (currentStatus === 'pending') {
        newStatus = 'in-progress';
      } else if (currentStatus === 'in-progress') {
        newStatus = 'completed';
      } else {
        return; // Already completed
      }

      await tasksApi.updateStatus(taskId, newStatus);
      toast.success(`Task marked as ${newStatus.replace('-', ' ')}`);
      loadTasks();
    } catch (error: any) {
      console.error('Error updating task status:', error);
      toast.error(error?.message || 'Failed to update task status');
    }
  };

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return <StatusBadge status="success" label="Completed" />;
      case 'in-progress':
        return <StatusBadge status="info" label="In Progress" />;
      default:
        return <StatusBadge status="pending" label="Pending" />;
    }
  };

  const getProjectName = (projectId: Task['projectId']): string => {
    if (typeof projectId === 'string') {
      const project = projects.find(p => p._id === projectId);
      return project?.name || t('materials.unknown') + ' ' + t('dpr.project');
    }
    return projectId?.name || 'Unknown Project';
  };

  const getAssignedUserName = (assignedTo: Task['assignedTo']): string => {
    if (typeof assignedTo === 'string') {
      return 'Unknown User';
    }
    return assignedTo?.name || t('materials.unknown') + ' ' + t('common.details');
  };

  // Permission check
  if (!canCreateTasks && role !== 'engineer') {
    return (
      <MobileLayout role={role || "engineer"}>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Access Denied
              </h2>
              <p className="text-sm text-muted-foreground">
                You don't have permission to view tasks.
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
    <MobileLayout role={role || "engineer"}>
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-3 sm:py-4 pl-0 pr-3 sm:pr-4 safe-area-top w-full">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">{t('tasks.title')}</h1>
              <p className="text-xs text-muted-foreground">{t('tasks.manageProjectTasks')}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-4 w-full overflow-x-hidden max-w-full">
          {/* Filters and Create Button */}
          <div className="flex flex-col gap-3">
            {canCreateTasks && (
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" variant="glow">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('tasks.createTask')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] bg-card text-foreground max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-foreground">{t('tasks.createTask')}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectId">{t('tasks.project')} *</Label>
                      <Select
                        value={newTask.projectId}
                        onValueChange={(value) => setNewTask({ ...newTask, projectId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t('tasks.selectProject')} />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.filter(Boolean).map((project) => (
                            <SelectItem key={project._id} value={project._id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="title">{t('tasks.taskTitle')} *</Label>
                      <Input
                        id="title"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                        className="bg-background text-foreground"
                        placeholder={t('tasks.enterTaskTitle')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">{t('tasks.description')}</Label>
                      <Textarea
                        id="description"
                        value={newTask.description}
                        onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                        className="bg-background text-foreground"
                        placeholder={t('tasks.enterTaskDescription')}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="assignedTo">{t('tasks.assignToEngineerOptional')}</Label>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            id="assignedTo"
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
                                setNewTask(prev => ({ ...prev, assignedTo: "" }));
                                return;
                              }
                              
                              // Debounce search - only search after user stops typing for 500ms
                              // Don't show error toast for debounced searches
                              searchTimeoutRef.current = setTimeout(() => {
                                handleSearchEngineer(value, false);
                              }, 500);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && engineerSearch.trim().length > 0) {
                                // Clear timeout and search immediately on Enter
                                if (searchTimeoutRef.current) {
                                  clearTimeout(searchTimeoutRef.current);
                                }
                                // Show error toast on explicit search (Enter key)
                                handleSearchEngineer(engineerSearch, true);
                              }
                            }}
                            className="bg-background text-foreground"
                            placeholder="Search by OffSite ID (e.g., OSSE0023)"
                          />
                        </div>
                        {isSearchingEngineer && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Searching...
                          </div>
                        )}
                        {searchResults.length > 0 && (
                          <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-sm font-medium text-foreground">
                              {searchResults[0].name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {searchResults[0].offsiteId}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plannedLabourCount">Planned Labour Count (Optional)</Label>
                      <Input
                        id="plannedLabourCount"
                        type="number"
                        min="0"
                        value={newTask.plannedLabourCount}
                        onChange={(e) => setNewTask({ ...newTask, plannedLabourCount: parseInt(e.target.value) || 0 })}
                        className="bg-background text-foreground"
                        placeholder="Number of labourers planned per day"
                      />
                      <p className="text-xs text-muted-foreground">
                        Used to calculate labour gap vs actual attendance
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Due Date (Optional)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newTask.dueDate && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {newTask.dueDate ? (
                              format(newTask.dueDate, "PPP")
                            ) : (
                              <span>{t('tasks.pickDate')}</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <CalendarComponent
                            mode="single"
                            selected={newTask.dueDate}
                            onSelect={(date) => setNewTask({ ...newTask, dueDate: date })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCreateDialogOpen(false);
                          resetNewTask();
                        }}
                        className="flex-1"
                        disabled={isCreating}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button
                        onClick={handleCreateTask}
                        className="flex-1"
                        disabled={isCreating || !newTask.projectId || !newTask.title.trim()}
                      >
                        {isCreating ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {t('common.loading')}
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            {t('tasks.createTask')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Filters */}
            <div className="flex gap-2">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('tasks.allTasks')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('tasks.allTasks')}</SelectItem>
                  {projects.filter(Boolean).map((project) => (
                    <SelectItem key={project._id} value={project._id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={t('status.pending')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  <SelectItem value="pending">{t('status.pending')}</SelectItem>
                  <SelectItem value="in-progress">{t('status.inProgress')}</SelectItem>
                  <SelectItem value="completed">{t('status.completed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tasks List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : tasks.length === 0 ? (
            <Card variant="gradient">
              <CardContent className="p-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">{t('tasks.noTasks')}</p>
                <p className="text-sm text-muted-foreground">
                  {canCreateTasks 
                    ? "Create your first task to get started" 
                    : "No tasks assigned to you yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tasks.map((task, index) => (
                <motion.div
                  key={task._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="gradient" className="hover:border-primary/30 transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(task.status)}
                            <h3 className="font-display font-semibold text-foreground">
                              {task.title}
                            </h3>
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {task.description}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(task.status)}
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Building2 className="w-3 h-3" />
                          <span>{getProjectName(task.projectId)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <UserIcon className="w-3 h-3" />
                          <span>{t('tasks.assignedToColon')} {getAssignedUserName(task.assignedTo)}</span>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Due: {format(new Date(task.dueDate), "PPP")}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {role === 'engineer' && task.status !== 'completed' && (
                        <Button
                          variant="outline"
                          className="w-full mt-3"
                          onClick={() => handleUpdateStatus(task._id, task.status)}
                        >
                          {task.status === 'pending' ? (
                            <>
                              <Clock className="w-4 h-4 mr-2" />
                              Start Task
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark Complete
                            </>
                          )}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

