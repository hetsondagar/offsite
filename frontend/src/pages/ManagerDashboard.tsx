import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/common/KPICard";
import { HealthScoreRing } from "@/components/common/HealthScoreRing";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store/hooks";
import { 
  FolderKanban, 
  Users, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  ChevronRight,
  Building2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { projectsApi } from "@/services/api/projects";
import { insightsApi } from "@/services/api/insights";
import { materialsApi } from "@/services/api/materials";

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { role } = useAppSelector((state) => state.auth);
  const [projectOverview, setProjectOverview] = useState<any[]>([]);
  const [healthScore, setHealthScore] = useState(78);
  const [kpis, setKpis] = useState({
    activeProjects: 0,
    attendance: 0,
    pendingApprovals: 0,
    delayRisks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      const [projectsData, healthData, delayRisksData, materialsData] = await Promise.all([
        projectsApi.getAll(1, 10),
        insightsApi.getSiteHealth(),
        insightsApi.getDelayRisks(),
        materialsApi.getPending(1, 1),
      ]);

      setProjectOverview(projectsData?.projects || []);
      setHealthScore(healthData?.overallHealthScore || 78);
      setKpis({
        activeProjects: projectsData?.projects?.length || 0,
        attendance: 92, // This would come from attendance API
        pendingApprovals: materialsData?.requests?.length || 0,
        delayRisks: delayRisksData?.filter((r: any) => r.risk === 'High').length || 0,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout role={role || "manager"}>
      <div className="p-4 space-y-6 safe-area-top">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 opacity-0 animate-fade-up">
          {/* Centered Large Logo */}
          <div className="flex justify-center w-full">
            <Logo size="xl" showText={false} />
          </div>
          
          {/* Date, Theme Toggle and Status */}
          <div className="flex items-center justify-between w-full">
            <p className="text-xs text-muted-foreground">{currentDate}</p>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="icon" />
              <StatusBadge status="success" label="Online" pulse />
            </div>
          </div>
        </div>

        {/* Site Health Score */}
        <Card variant="glow" className="opacity-0 animate-fade-up stagger-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Overall Site Health
                </h2>
                <p className="text-sm text-muted-foreground">
                  Across all active projects
                </p>
                <div className="flex gap-2 mt-4">
                  <StatusBadge status="success" label="4 On Track" />
                  <StatusBadge status="warning" label="1 At Risk" />
                </div>
              </div>
              <HealthScoreRing score={healthScore} size="lg" />
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            title="Active Projects"
            value={kpis.activeProjects}
            icon={FolderKanban}
            trend="up"
            trendValue="+1 this month"
            delay={100}
          />
          <KPICard
            title="Today's Attendance"
            value={kpis.attendance}
            suffix="%"
            icon={Users}
            variant="success"
            trend="up"
            trendValue="+5% vs avg"
            delay={200}
          />
          <KPICard
            title="Pending Approvals"
            value={kpis.pendingApprovals}
            icon={Clock}
            variant="warning"
            delay={300}
          />
          <KPICard
            title="Delay Risks"
            value={kpis.delayRisks}
            icon={AlertTriangle}
            variant="destructive"
            delay={400}
          />
        </div>

        {/* Projects Overview */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-4">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-primary" />
              Projects
            </CardTitle>
            <button 
              onClick={() => navigate("/projects")}
              className="text-sm text-primary flex items-center gap-1"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          </CardHeader>
          <CardContent className="space-y-3">
            {projectOverview.map((project, index) => (
              <div 
                key={index} 
                className="p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                onClick={() => navigate("/projects")}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-foreground">{project.name}</span>
                  {project.risk && (
                    <StatusBadge status="warning" label="At Risk" />
                  )}
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground mt-1 block">
                  {project.progress}% complete
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Insights Preview */}
        {hasPermission("canViewAIInsights") && (
          <Card variant="gradient" className="opacity-0 animate-fade-up stagger-5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-primary/10 shrink-0">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-sm text-foreground">
                    AI Insight
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Metro Mall Phase 2 may face a 3-day delay due to pending steel delivery. 
                    Consider expediting the order.
                  </p>
                  <button 
                    onClick={() => navigate("/insights")}
                    className="text-xs text-primary mt-2 flex items-center gap-1"
                  >
                    View All Insights <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
