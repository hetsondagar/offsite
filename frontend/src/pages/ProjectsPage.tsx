import { useState, useEffect } from "react";
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
import { toast } from "sonner";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const { role } = useAppSelector((state) => state.auth);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProject, setNewProject] = useState({
    name: "",
    location: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectsApi.getAll(1, 100);
      setProjects(data?.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.location || !newProject.startDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      const projectData = {
        name: newProject.name.trim(),
        location: newProject.location.trim(),
        startDate: new Date(newProject.startDate).toISOString(),
        endDate: newProject.endDate ? new Date(newProject.endDate).toISOString() : undefined,
      };

      await projectsApi.create(projectData);
      
      toast.success('Project created successfully!');
      setIsCreateDialogOpen(false);
      setNewProject({
        name: "",
        location: "",
        startDate: "",
        endDate: "",
      });
      
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
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">Projects</h1>
              <p className="text-xs text-muted-foreground">
                {isLoading ? "Loading..." : `${projects.length} active projects`}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <Card variant="gradient">
              <CardContent className="p-8 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">No projects found</p>
                <p className="text-sm text-muted-foreground">Create your first project to get started</p>
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
                      <Button variant="outline" className="w-full justify-between">
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
            <DialogContent className="sm:max-w-[425px] bg-card text-foreground">
              <DialogHeader>
                <DialogTitle className="text-foreground">Create New Project</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Project Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Riverside Apartments"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    className="bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location *</Label>
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
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date *</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={newProject.startDate}
                    onChange={(e) => setNewProject({ ...newProject, startDate: e.target.value })}
                    className="bg-background text-foreground"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newProject.endDate}
                    onChange={(e) => setNewProject({ ...newProject, endDate: e.target.value })}
                    className="bg-background text-foreground"
                    min={newProject.startDate}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  className="flex-1"
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateProject}
                  className="flex-1"
                  disabled={isCreating || !newProject.name || !newProject.location || !newProject.startDate}
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
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </MobileLayout>
  );
}
