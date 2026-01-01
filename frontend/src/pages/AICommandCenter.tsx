import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { HealthScoreRing } from "@/components/common/HealthScoreRing";
import { useAppSelector } from "@/store/hooks";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  WifiOff,
  Sparkles,
} from "lucide-react";
import { projectsApi } from "@/services/api/projects";
import { aiApi, SiteRiskAssessment, Anomaly } from "@/services/api/ai";
import { saveAICache, getAICache } from "@/lib/indexeddb";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AICommandCenter() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { isOnline } = useAppSelector((state) => state.offline);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [riskAssessment, setRiskAssessment] = useState<SiteRiskAssessment | null>(null);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingRisk, setIsLoadingRisk] = useState(false);
  const [isLoadingAnomalies, setIsLoadingAnomalies] = useState(false);
  const [isUsingCache, setIsUsingCache] = useState(false);

  useEffect(() => {
    if (!hasPermission("canViewAIInsights")) {
      navigate("/");
      return;
    }
    loadProjects();
  }, [hasPermission, navigate]);

  useEffect(() => {
    if (selectedProjectId) {
      loadRiskAssessment();
      loadAnomalies();
    }
  }, [selectedProjectId]);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectsApi.getAll(1, 100);
      setProjects(data?.projects || []);
      if (data?.projects && data.projects.length > 0) {
        setSelectedProjectId(data.projects[0]._id);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRiskAssessment = async () => {
    if (!selectedProjectId) return;

    try {
      setIsLoadingRisk(true);
      setIsUsingCache(false);

      // Try cache first if offline
      if (!isOnline) {
        const cached = await getAICache('risk', selectedProjectId);
        if (cached) {
          setRiskAssessment(cached);
          setIsUsingCache(true);
          setIsLoadingRisk(false);
          return;
        }
      }

      const assessment = await aiApi.getSiteRisk(selectedProjectId);
      setRiskAssessment(assessment);
      
      // Cache the response
      await saveAICache('risk', selectedProjectId, assessment);
    } catch (error: any) {
      console.error('Error loading risk assessment:', error);
      
      // Try cache as fallback
      const cached = await getAICache('risk', selectedProjectId);
      if (cached) {
        setRiskAssessment(cached);
        setIsUsingCache(true);
        toast.warning('Using cached data - offline or API error');
      } else {
        toast.error(error.message || 'Failed to load risk assessment');
      }
    } finally {
      setIsLoadingRisk(false);
    }
  };

  const loadAnomalies = async () => {
    if (!selectedProjectId) return;

    try {
      setIsLoadingAnomalies(true);
      setIsUsingCache(false);

      // Try cache first if offline
      if (!isOnline) {
        const cached = await getAICache('anomalies', selectedProjectId);
        if (cached) {
          setAnomalies(cached.anomalies || []);
          setIsUsingCache(true);
          setIsLoadingAnomalies(false);
          return;
        }
      }

      const data = await aiApi.getAnomalies(selectedProjectId);
      setAnomalies(data.anomalies || []);
      
      // Cache the response
      await saveAICache('anomalies', selectedProjectId, data);
    } catch (error: any) {
      console.error('Error loading anomalies:', error);
      
      // Try cache as fallback
      const cached = await getAICache('anomalies', selectedProjectId);
      if (cached) {
        setAnomalies(cached.anomalies || []);
        setIsUsingCache(true);
        toast.warning('Using cached data - offline or API error');
      } else {
        toast.error(error.message || 'Failed to load anomalies');
      }
    } finally {
      setIsLoadingAnomalies(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'HIGH':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'LOW':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'MEDIUM':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'HIGH':
        return 'bg-red-500/10 text-red-600 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  const selectedProject = projects.find(p => p._id === selectedProjectId);

  return (
    <MobileLayout>
      <div className="space-y-6 pb-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI Command Center
            </h1>
            <p className="text-sm text-muted-foreground">AI-powered risk & anomaly insights</p>
          </div>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Project</label>
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full p-2 rounded-lg border bg-background text-foreground"
              >
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Offline/Cache Warning */}
        {isUsingCache && (
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-yellow-600">
                <WifiOff className="w-4 h-4" />
                <p className="text-sm">Showing cached data. Refresh when online for latest insights.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Site Risk Radar */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Site Risk Radar
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={loadRiskAssessment}
                disabled={isLoadingRisk || !isOnline}
              >
                {isLoadingRisk ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingRisk ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : riskAssessment ? (
              <div className="space-y-6">
                {/* Risk Score & Level */}
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Risk Score</p>
                    <p className="text-3xl font-bold">{riskAssessment.riskScore}/100</p>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs border",
                      getRiskColor(riskAssessment.riskLevel)
                    )}>
                      {riskAssessment.riskLevel} RISK
                    </span>
                  </div>
                  <HealthScoreRing 
                    score={100 - riskAssessment.riskScore} 
                    size="lg" 
                  />
                </div>

                {/* AI Summary */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <p className="text-sm font-medium">AI Analysis</p>
                    <span className="text-xs text-muted-foreground">
                      (Confidence: {Math.round(riskAssessment.aiAnalysis.confidence * 100)}%)
                    </span>
                  </div>
                  <p className="text-sm text-foreground">
                    {riskAssessment.aiAnalysis.summary}
                  </p>
                </div>

                {/* Top Reasons */}
                {riskAssessment.aiAnalysis.topReasons.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Top Risk Factors</p>
                    <div className="space-y-2">
                      {riskAssessment.aiAnalysis.topReasons.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                          <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                          <p className="text-sm flex-1">{reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {riskAssessment.aiAnalysis.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">AI Recommendations</p>
                    <div className="space-y-2">
                      {riskAssessment.aiAnalysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          <p className="text-sm flex-1">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Signal Details */}
                <div className="space-y-2 pt-4 border-t">
                  <p className="text-sm font-medium">Risk Signals</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">DPR Delay</p>
                      <p className="font-medium">{riskAssessment.signals.dprDelayDays} days</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">Attendance Variance</p>
                      <p className="font-medium">{riskAssessment.signals.attendanceVariance}%</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">Pending Approvals</p>
                      <p className="font-medium">{riskAssessment.signals.pendingApprovals}</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-muted-foreground">Material Shortage</p>
                      <p className="font-medium">
                        {riskAssessment.signals.materialShortage ? (
                          <XCircle className="w-4 h-4 text-destructive inline" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-success inline" />
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No risk assessment available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Anomaly Alerts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Anomaly Alerts ({anomalies.length})
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={loadAnomalies}
                disabled={isLoadingAnomalies || !isOnline}
              >
                {isLoadingAnomalies ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingAnomalies ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : anomalies.length > 0 ? (
              <div className="space-y-4">
                {anomalies.map((anomaly, idx) => (
                  <Card key={idx} className={cn(
                    "border-l-4",
                    anomaly.severity === 'HIGH' && "border-l-red-500",
                    anomaly.severity === 'MEDIUM' && "border-l-yellow-500",
                    anomaly.severity === 'LOW' && "border-l-blue-500"
                  )}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "px-2 py-1 rounded text-xs border",
                                getSeverityColor(anomaly.severity)
                              )}>
                                {anomaly.severity}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {Math.round(anomaly.confidence * 100)}% confidence
                              </span>
                            </div>
                            <p className="font-medium text-sm">{anomaly.patternDetected}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {anomaly.historicalComparison}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">AI Explanation</p>
                            <p className="text-sm">{anomaly.explanation}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Business Impact</p>
                            <p className="text-sm">{anomaly.businessImpact}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Action</p>
                            <p className="text-sm">{anomaly.recommendedAction}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-success mx-auto mb-2 opacity-50" />
                <p className="text-sm text-muted-foreground">No anomalies detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All systems operating normally
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}

