import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthScoreRing } from "@/components/common/HealthScoreRing";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store/hooks";
import { AlertCircle } from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  ArrowLeft, 
  TrendingUp,
  AlertTriangle,
  Package,
  Clock,
  ChevronRight,
  BarChart3,
  Lightbulb
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";
import { insightsApi } from "@/services/api/insights";
import { projectsApi } from "@/services/api/projects";
import { Loader2, Sparkles } from "lucide-react";

export default function InsightsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { role } = useAppSelector((state) => state.auth);
  const [siteHealth, setSiteHealth] = useState<any>(null);
  const [delayRisks, setDelayRisks] = useState<any[]>([]);
  const [materialAnomalies, setMaterialAnomalies] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Check permission
  useEffect(() => {
    if (!hasPermission("canViewAIInsights")) {
      navigate("/");
    }
  }, [hasPermission, navigate]);

  // Load insights data
  useEffect(() => {
    const loadInsights = async () => {
      try {
        setIsLoading(true);
        const [healthData, risksData, anomaliesData, projectsData] = await Promise.all([
          insightsApi.getSiteHealth(),
          insightsApi.getDelayRisks(),
          insightsApi.getMaterialAnomalies(),
          projectsApi.getAll(1, 100),
        ]);
        
        setSiteHealth(healthData);
        setDelayRisks(risksData || []);
        setMaterialAnomalies(anomaliesData || []);
        setProjects(projectsData?.projects || []);
      } catch (error) {
        console.error('Error loading insights:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadInsights();
  }, []);

  // Permission check
  if (!hasPermission("canViewAIInsights")) {
    return (
      <MobileLayout role={role || "manager"}>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Access Denied
              </h2>
              <p className="text-sm text-muted-foreground">
                You don't have permission to view AI insights. Only Project Managers and Owners can access this page.
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
    <MobileLayout role={role || "manager"}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">AI Insights</h1>
              <p className="text-xs text-muted-foreground">Smart analysis & predictions</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/ai-command")}
              className="absolute right-0"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              AI Command
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Site Health Overview */}
              <Card variant="glow" className="animate-fade-up">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-semibold text-foreground">
                        Overall Health Score
                      </h2>
                      <p className="text-sm text-muted-foreground mt-1">
                        Based on {siteHealth?.totalProjects || projects.length} active projects
                      </p>
                      <div className="flex gap-2 mt-4">
                        <StatusBadge status="success" label={`${siteHealth?.projectHealthScores?.filter((p: any) => p.healthScore >= 70).length || 0} Healthy`} />
                        <StatusBadge status="warning" label={`${siteHealth?.projectHealthScores?.filter((p: any) => p.healthScore < 70 && p.healthScore >= 50).length || 0} At Risk`} />
                      </div>
                    </div>
                    <HealthScoreRing score={siteHealth?.overallHealthScore || 0} size="lg" />
                  </div>
                </CardContent>
              </Card>

              {/* Delay Risk Predictor */}
              <Card variant="gradient" className="animate-fade-up stagger-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="w-4 h-4 text-primary" />
                Delay Risk Predictor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {delayRisks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No delay risks detected</p>
              ) : (
                delayRisks.map((risk: any, index: number) => (
                  <div 
                    key={risk.projectId || index}
                    className="p-3 rounded-xl bg-muted/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-foreground">{risk.projectName || risk.project}</span>
                      <StatusBadge 
                        status={risk.risk === "High" ? "error" : risk.risk === "Medium" ? "warning" : "success"}
                        label={`${risk.risk} Risk`}
                        pulse={risk.risk === "High"}
                      />
                    </div>
                    
                    {/* Probability Bar */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Probability</span>
                        <span className="text-foreground font-medium">{risk.probability || 0}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${
                          risk.probability > 60 ? "bg-destructive" : 
                          risk.probability > 30 ? "bg-warning" : "bg-success"
                        }`}
                        style={{ width: `${risk.probability}%` }}
                      />
                    </div>
                  </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Impact: {risk.impact}</span>
                      <span className="text-muted-foreground">Cause: {risk.cause}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

              {/* Material Anomalies */}
              {materialAnomalies.length > 0 && (
                <Card variant="gradient" className="animate-fade-up stagger-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4 text-primary" />
                  Material Anomalies
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {materialAnomalies.map((anomaly: any, index: number) => (
                  <div key={anomaly._id || index} className="p-3 rounded-xl bg-warning/10 border border-warning/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-foreground">{anomaly.materialName}</span>
                      <StatusBadge status="warning" label="Anomaly" />
                    </div>
                    <p className="text-xs text-muted-foreground">{anomaly.reason || 'Unusual quantity detected'}</p>
                  </div>
                ))}
              </CardContent>
                </Card>
              )}

              {/* Project Progress Chart */}
              {projects.length > 0 && (
                <Card variant="gradient" className="animate-fade-up stagger-3">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Project Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={{}}>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={projects.map(p => ({ name: p.name, progress: p.progress }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="progress" fill="var(--primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
                </CardContent>
              </Card>
              )}
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
