import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { HealthScoreRing } from "@/components/common/HealthScoreRing";
import { Logo } from "@/components/common/Logo";
import { 
  ArrowLeft, 
  Building2,
  Users,
  Calendar,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { projectsApi, Project } from "@/services/api/projects";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout role="manager">
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
      </div>
    </MobileLayout>
  );
}
