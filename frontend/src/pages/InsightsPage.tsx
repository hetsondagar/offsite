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
  const [pendingMaterials, setPendingMaterials] = useState<any[]>([]);
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
        const [healthData, risksData, anomaliesData, pendingMaterialsData, projectsData] = await Promise.all([
          insightsApi.getSiteHealth(),
          insightsApi.getDelayRisks(),
          insightsApi.getMaterialAnomalies(),
          insightsApi.getPendingMaterialRequests(),
          projectsApi.getAll(1, 100),
        ]);
        
        setSiteHealth(healthData);
        setDelayRisks(risksData || []);
        setMaterialAnomalies(anomaliesData || []);
        setPendingMaterials(pendingMaterialsData || []);
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
            <div className="flex-1 flex flex-col items-center justify-center px-16 sm:px-0">
              <h1 className="font-display font-semibold text-lg">AI Insights</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">Smart analysis & predictions</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/ai-command")}
              className="absolute right-0 text-xs sm:text-sm px-2 sm:px-4"
            >
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-1" />
              <span className="hidden sm:inline">AI Command</span>
              <span className="sm:hidden">AI Command</span>
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

                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Impact:</span>
                        <span className="text-foreground font-medium">{risk.impact}</span>
                      </div>
                      <div className="text-muted-foreground line-clamp-2">
                        {risk.cause}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

              {/* Pending Material Requests */}
              {pendingMaterials.length > 0 && (
                <Card variant="gradient" className="animate-fade-up stagger-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="w-4 h-4 text-primary" />
                  Pending Material Requests ({pendingMaterials.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingMaterials.map((request: any, index: number) => {
                  const projectName = typeof request.projectId === 'object' ? request.projectId?.name : 'Unknown Project';
                  const requesterName = typeof request.requestedBy === 'object' ? request.requestedBy?.name : 'Unknown';
                  const isAnomaly = request.anomalyDetected;
                  const delaySeverity = request.delaySeverity || 'normal';
                  
                  return (
                    <div 
                      key={request._id || index} 
                      className={`p-3 rounded-xl border ${
                        isAnomaly 
                          ? 'bg-warning/10 border-warning/30' 
                          : delaySeverity === 'critical'
                          ? 'bg-destructive/10 border-destructive/30'
                          : delaySeverity === 'warning'
                          ? 'bg-warning/10 border-warning/20'
                          : 'bg-muted/50 border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{request.materialName}</span>
                          {isAnomaly && (
                            <StatusBadge status="warning" label="Anomaly" />
                          )}
                          {delaySeverity === 'critical' && (
                            <StatusBadge status="error" label="Critical Delay" />
                          )}
                          {delaySeverity === 'warning' && !isAnomaly && (
                            <StatusBadge status="warning" label="Delayed" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span>Project: {projectName}</span>
                          <span className="font-medium text-foreground">{request.quantity} {request.unit}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Requested by: {requesterName}</span>
                          {request.delayDays > 0 && (
                            <span className={delaySeverity === 'critical' ? 'text-destructive font-medium' : delaySeverity === 'warning' ? 'text-warning font-medium' : ''}>
                              {request.delayDays} day(s) pending
                            </span>
                          )}
                          {request.delayHours >= 24 && request.delayDays === 0 && (
                            <span className={delaySeverity === 'critical' ? 'text-destructive font-medium' : delaySeverity === 'warning' ? 'text-warning font-medium' : ''}>
                              {Math.floor(request.delayHours)}h pending
                            </span>
                          )}
                        </div>
                        {request.reason && (
                          <p className="text-xs text-muted-foreground mt-1">{request.reason}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
                </Card>
              )}

              {/* Material Anomalies */}
              {materialAnomalies.length > 0 && (
                <Card variant="gradient" className="animate-fade-up stagger-2">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                  Material Anomalies ({materialAnomalies.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {materialAnomalies.map((anomaly: any, index: number) => {
                  const projectName = typeof anomaly.projectId === 'object' ? anomaly.projectId?.name : 'Unknown Project';
                  return (
                    <div key={anomaly._id || index} className="p-3 rounded-xl bg-warning/10 border border-warning/30">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm text-foreground">{anomaly.materialName}</span>
                        <StatusBadge status="warning" label="Anomaly" />
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>Project: {projectName}</div>
                        <div>Quantity: {anomaly.quantity} {anomaly.unit}</div>
                        <p>{anomaly.reason || 'Unusual quantity detected'}</p>
                      </div>
                    </div>
                  );
                })}
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
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart 
                      data={projects.map(p => ({ 
                        name: p.name.length > 15 ? p.name.substring(0, 15) + '...' : p.name, 
                        fullName: p.name,
                        progress: p.progress || 0 
                      }))}
                      margin={{ top: 5, right: 10, left: 0, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={80}
                        tick={{ fontSize: 11 }}
                        interval={0}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tick={{ fontSize: 11 }}
                        label={{ value: 'Progress %', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }}
                      />
                      <ChartTooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid gap-2">
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Project
                                    </span>
                                    <span className="font-bold text-sm">{data.fullName}</span>
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[0.70rem] uppercase text-muted-foreground">
                                      Progress
                                    </span>
                                    <span className="font-bold text-sm">{data.progress}%</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar 
                        dataKey="progress" 
                        fill="hsl(var(--primary))"
                        radius={[4, 4, 0, 0]}
                      />
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
