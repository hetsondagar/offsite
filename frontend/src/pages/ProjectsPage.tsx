import { useState } from "react";
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
  AlertTriangle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { projects } from "@/data/dummy";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  return (
    <MobileLayout role="manager">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 p-4 safe-area-top">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Logo size="sm" showText={false} />
            <div className="flex-1">
              <h1 className="font-display font-semibold text-lg">Projects</h1>
              <p className="text-xs text-muted-foreground">{projects.length} active projects</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {projects.map((project, index) => (
            <Card 
              key={project.id}
              variant="gradient"
              className={cn(
                "cursor-pointer transition-all duration-300 opacity-0 animate-fade-up",
                "hover:border-primary/30 hover:shadow-glow-sm",
                selectedProject === project.id && "border-primary shadow-glow-md"
              )}
              style={{ animationDelay: `${index * 100}ms` }}
              onClick={() => setSelectedProject(selectedProject === project.id ? null : project.id)}
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
                      {project.risk && (
                        <StatusBadge status="warning" label="At Risk" />
                      )}
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
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {project.workers}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {project.dueDate}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <TrendingUp className="w-3 h-3" />
                        {project.completedTasks}/{project.tasks} tasks
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded View */}
                {selectedProject === project.id && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-3 animate-fade-up">
                    {project.risk && (
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-warning/10 border border-warning/30">
                        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-warning">Risk Alert</p>
                          <p className="text-xs text-muted-foreground">{project.riskReason}</p>
                        </div>
                      </div>
                    )}
                    
                    <Button variant="outline" className="w-full justify-between">
                      View Project Details
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </MobileLayout>
  );
}
