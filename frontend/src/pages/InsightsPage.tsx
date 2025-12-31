import { useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HealthScoreRing } from "@/components/common/HealthScoreRing";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { usePermissions } from "@/hooks/usePermissions";
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
import { insights, delayRisks, materialUsageChartData, projectProgressChartData } from "@/data/dummy";

export default function InsightsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();

  // Check permission
  useEffect(() => {
    if (!hasPermission("canViewAIInsights")) {
      navigate("/");
    }
  }, [hasPermission, navigate]);

  // Permission check
  if (!hasPermission("canViewAIInsights")) {
    return (
      <MobileLayout role="manager">
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
              <h1 className="font-display font-semibold text-lg">AI Insights</h1>
              <p className="text-xs text-muted-foreground">Smart analysis & predictions</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Site Health Overview */}
          <Card variant="glow" className="animate-fade-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display font-semibold text-foreground">
                    Overall Health Score
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Based on 5 active projects
                  </p>
                  <div className="flex gap-2 mt-4">
                    <StatusBadge status="success" label="4 Healthy" />
                    <StatusBadge status="warning" label="1 At Risk" />
                  </div>
                </div>
                <HealthScoreRing score={78} size="lg" />
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
              {delayRisks.map((risk, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-xl bg-muted/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">{risk.project}</span>
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
                      <span className="text-foreground font-medium">{risk.probability}%</span>
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
              ))}
            </CardContent>
          </Card>

          {/* AI Insights */}
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              Smart Insights
            </h2>

            {insights.map((insight, index) => (
              <Card 
                key={insight.id}
                variant="gradient"
                className={`animate-fade-up border-l-4 ${
                  insight.severity === "high" ? "border-l-destructive" :
                  insight.severity === "medium" ? "border-l-warning" : "border-l-success"
                }`}
                style={{ animationDelay: `${(index + 2) * 100}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${
                      insight.type === "delay" ? "bg-destructive/10" :
                      insight.type === "anomaly" ? "bg-warning/10" : "bg-success/10"
                    }`}>
                      {insight.type === "delay" && <Clock className="w-4 h-4 text-destructive" />}
                      {insight.type === "anomaly" && <AlertTriangle className="w-4 h-4 text-warning" />}
                      {insight.type === "positive" && <TrendingUp className="w-4 h-4 text-success" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-sm text-foreground">{insight.title}</h3>
                        <StatusBadge 
                          status={
                            insight.severity === "high" ? "error" :
                            insight.severity === "medium" ? "warning" : "success"
                          }
                          label={insight.project}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      
                      <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/20">
                        <p className="text-xs text-primary">
                          <span className="font-medium">Recommendation:</span> {insight.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Material Usage Chart */}
          <Card variant="gradient" className="animate-fade-up stagger-4">
            <CardHeader className="pb-3 flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="w-4 h-4 text-primary" />
                Material Usage Trends
              </CardTitle>
              <button className="text-xs text-primary flex items-center gap-1">
                View Details <ChevronRight className="w-3 h-3" />
              </button>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  usage: { label: "Usage %", color: "hsl(var(--primary))" },
                }}
                className="h-[200px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: "Cement", usage: 85 },
                    { name: "Steel", usage: 62 },
                    { name: "Concrete", usage: 145 },
                    { name: "Sand", usage: 78 },
                    { name: "Bricks", usage: 92 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="name" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="usage" 
                      fill="hsl(var(--primary))"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Project Progress Chart */}
          <Card variant="gradient" className="animate-fade-up stagger-5">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-4 h-4 text-primary" />
                Project Progress (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  progress: { label: "Progress %", color: "hsl(var(--primary))" },
                }}
                className="h-[200px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { day: "Mon", progress: 45 },
                    { day: "Tue", progress: 52 },
                    { day: "Wed", progress: 58 },
                    { day: "Thu", progress: 65 },
                    { day: "Fri", progress: 70 },
                    { day: "Sat", progress: 75 },
                    { day: "Sun", progress: 78 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="day" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area 
                      type="monotone" 
                      dataKey="progress" 
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.2)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </MobileLayout>
  );
}
