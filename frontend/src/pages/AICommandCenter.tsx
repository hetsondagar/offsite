import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useEffect(() => {
    if (selectedProjectId) {
      loadRiskAssessment();
      loadAnomalies();
      
      // Auto-refresh every 60 seconds to get latest data
      const refreshInterval = setInterval(() => {
        loadRiskAssessment();
        loadAnomalies();
      }, 60000);
      
      return () => clearInterval(refreshInterval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProjectId]); // Only when selectedProjectId changes

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
      toast.error(t('projects.failedToLoadProjects'));
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
      
      // Validate and ensure all required fields exist
      if (!assessment) {
        throw new Error('Invalid risk assessment data received');
      }
      
      // Debug logging
      console.log('Risk Assessment received:', {
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        hasAiAnalysis: !!assessment.aiAnalysis,
        recommendationsCount: assessment.aiAnalysis?.recommendations?.length ?? 0,
        topReasonsCount: assessment.aiAnalysis?.topReasons?.length ?? 0,
      });
      
      // Ensure nested objects exist
      if (!assessment.aiAnalysis) {
        assessment.aiAnalysis = {
          riskLevel: assessment.riskLevel || 'LOW',
          summary: 'Risk assessment data is incomplete.',
          topReasons: [],
          recommendations: [],
          confidence: 0.5,
        };
      }
      
      if (!assessment.signals) {
        assessment.signals = {
          dprDelayDays: 0,
          dprDelayHours: 0,
          attendanceVariance: 0,
          pendingApprovals: 0,
          materialShortage: false,
        };
      }
      
      // Ensure arrays exist and have fallback values
      if (!Array.isArray(assessment.aiAnalysis.topReasons)) {
        assessment.aiAnalysis.topReasons = [];
      }
      if (!Array.isArray(assessment.aiAnalysis.recommendations)) {
        assessment.aiAnalysis.recommendations = [];
      }
      
      // Ensure recommendations always has at least fallback values if empty
      if (assessment.aiAnalysis.recommendations.length === 0) {
        assessment.aiAnalysis.recommendations = [
          'Review DPR submission process',
          'Monitor attendance patterns',
          'Streamline approval workflow',
        ];
        console.warn('No recommendations from AI, using fallback values');
      }
      
      setRiskAssessment(assessment);
      
      // Cache the response
      await saveAICache('risk', selectedProjectId, assessment);
    } catch (error: any) {
      console.error('Error loading risk assessment:', error);
      
      // Try cache as fallback
      try {
        const cached = await getAICache('risk', selectedProjectId);
        if (cached) {
          setRiskAssessment(cached);
          setIsUsingCache(true);
          toast.warning('Using cached data - offline or API error');
        } else {
          toast.error(error.message || t('aiCommand.noRiskAssessment'));
        }
      } catch (cacheError) {
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
        toast.error(error.message || t('aiCommand.noAnomaliesDetected'));
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
              {t('aiCommand.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{t('insights.smartAnalysis')}</p>
          </div>
        </div>

        {/* Project Selector */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('projects.selectProject')}</label>
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
                <p className="text-sm">{t('aiCommand.showingCachedData')}</p>
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
                {t('aiCommand.siteRiskRadar')}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={loadRiskAssessment}
                disabled={isLoadingRisk}
                title={!isOnline ? t('aiCommand.offlineWillUseCache') : t('aiCommand.refreshRiskAssessment')}
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
                    <p className="text-sm text-muted-foreground">{t('aiCommand.riskScore')}</p>
                    <p className="text-3xl font-bold">
                      {riskAssessment.riskScore ?? 0}/100
                    </p>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs border",
                      getRiskColor(riskAssessment.riskLevel || 'LOW')
                    )}>
                      {(riskAssessment.riskLevel || 'LOW')} RISK
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <HealthScoreRing 
                      score={Math.max(0, Math.min(100, 100 - (riskAssessment.riskScore ?? 0)))} 
                      size="lg"
                      showLabel={true}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('aiCommand.healthScore')}
                    </p>
                  </div>
                </div>

                {/* AI Summary */}
                {riskAssessment.aiAnalysis && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <p className="text-sm font-medium">{t('aiCommand.aiAnalysis')}</p>
                      <span className="text-xs text-muted-foreground">
                        ({t('aiCommand.confidence', { percent: Math.round((riskAssessment.aiAnalysis.confidence ?? 0.7) * 100) })})
                      </span>
                    </div>
                    <p className="text-sm text-foreground">
                      {riskAssessment.aiAnalysis.summary || t('aiCommand.noAnalysisAvailable')}
                    </p>
                  </div>
                )}

                {/* Top Reasons */}
                {riskAssessment.aiAnalysis && riskAssessment.aiAnalysis.topReasons && riskAssessment.aiAnalysis.topReasons.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t('aiCommand.topRiskFactors')}</p>
                    <div className="space-y-2">
                      {riskAssessment.aiAnalysis.topReasons.map((reason, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                          <p className="text-sm flex-1">{reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {riskAssessment.aiAnalysis && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">{t('aiCommand.aiRecommendations')}</p>
                    {riskAssessment.aiAnalysis.recommendations && riskAssessment.aiAnalysis.recommendations.length > 0 ? (
                      <div className="space-y-2">
                        {riskAssessment.aiAnalysis.recommendations.map((rec, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                            <p className="text-sm flex-1">{rec}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-muted/50 border border-dashed">
                        <p className="text-sm text-muted-foreground text-center">
                          {t('aiCommand.noSpecificRecommendations')}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Signal Details */}
                {riskAssessment.signals && (
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-medium">{t('aiCommand.riskSignals')}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground">{t('aiCommand.dprDelay')}</p>
                        <p className="font-medium">
                          {riskAssessment.signals.dprDelayDays === 0 && (riskAssessment.signals.dprDelayHours === 0 || !riskAssessment.signals.dprDelayHours) ? (
                            <span className="text-green-600">{t('aiCommand.noDelay')}</span>
                          ) : riskAssessment.signals.dprDelayHours !== undefined && riskAssessment.signals.dprDelayHours < 24 ? (
                            `${riskAssessment.signals.dprDelayHours.toFixed(1)} hours`
                          ) : (
                            `${riskAssessment.signals.dprDelayDays ?? 0} days${riskAssessment.signals.dprDelayHours !== undefined && riskAssessment.signals.dprDelayHours > 0 ? ` (${riskAssessment.signals.dprDelayHours.toFixed(1)}h)` : ''}`
                          )}
                        </p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground">{t('aiCommand.attendanceVariance')}</p>
                        <p className="font-medium">{riskAssessment.signals.attendanceVariance ?? 0}%</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground">{t('aiCommand.pendingApprovals')}</p>
                        <p className="font-medium">{riskAssessment.signals.pendingApprovals ?? 0}</p>
                      </div>
                      <div className="p-2 rounded bg-muted/50">
                        <p className="text-muted-foreground">{t('aiCommand.materialShortage')}</p>
                        <p className="font-medium">
                          {riskAssessment.signals.materialShortage ? (
                            <XCircle className="w-4 h-4 text-red-600 inline" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-green-600 inline" />
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Task Status Breakdown */}
                {riskAssessment.projectContext && riskAssessment.projectContext.taskStatus && (
                  <div className="space-y-2 pt-4 border-t">
                    <p className="text-sm font-medium">{t('aiCommand.taskStatus')}</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
                        <p className="text-muted-foreground">{t('aiCommand.notStarted')}</p>
                        <p className="font-medium text-yellow-600">{riskAssessment.projectContext.taskStatus.pending ?? 0}</p>
                      </div>
                      <div className="p-2 rounded bg-blue-500/10 border border-blue-500/20">
                        <p className="text-muted-foreground">{t('aiCommand.inProgress')}</p>
                        <p className="font-medium text-blue-600">{riskAssessment.projectContext.taskStatus.inProgress ?? 0}</p>
                      </div>
                      <div className="p-2 rounded bg-green-500/10 border border-green-500/20">
                        <p className="text-muted-foreground">{t('aiCommand.completed')}</p>
                        <p className="font-medium text-green-600">{riskAssessment.projectContext.taskStatus.completed ?? 0}</p>
                      </div>
                    </div>
                    {(riskAssessment.projectContext.taskStatus.delayed > 0 || riskAssessment.projectContext.taskStatus.approachingDelay > 0) && (
                      <div className="mt-2 space-y-1">
                        {riskAssessment.projectContext.taskStatus.delayed > 0 && (
                          <div className="p-2 rounded bg-red-500/10 border border-red-500/30 flex items-center justify-between">
                            <p className="text-muted-foreground text-xs">{t('aiCommand.delayedTasks')}</p>
                            <p className="font-medium text-red-600 text-xs">{t('aiCommand.tasksPendingOver3Hours', { count: riskAssessment.projectContext.taskStatus.delayed })}</p>
                          </div>
                        )}
                        {riskAssessment.projectContext.taskStatus.approachingDelay > 0 && (
                          <div className="p-2 rounded bg-orange-500/10 border border-orange-500/30 flex items-center justify-between">
                            <p className="text-muted-foreground text-xs">{t('aiCommand.approachingDelay')}</p>
                            <p className="font-medium text-orange-600 text-xs">{t('aiCommand.tasksPending2To3Hours', { count: riskAssessment.projectContext.taskStatus.approachingDelay })}</p>
                          </div>
                        )}
                      </div>
                    )}
                    {riskAssessment.projectContext.taskStatus.total > 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {t('aiCommand.completionRate', { percent: Math.round((riskAssessment.projectContext.taskStatus.completed / riskAssessment.projectContext.taskStatus.total) * 100) })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('aiCommand.noRiskAssessment')}
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
                {t('aiCommand.anomalyAlerts', { count: anomalies.length })}
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={loadAnomalies}
                disabled={isLoadingAnomalies}
                title={!isOnline ? t('aiCommand.offlineWillUseCache') : t('aiCommand.refreshAnomalies')}
              >
                {isLoadingAnomalies ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-visible">
            {isLoadingAnomalies ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : anomalies.length > 0 ? (
              <div className="space-y-4 overflow-visible">
                {anomalies.map((anomaly, idx) => (
                  <Card key={idx} className={cn(
                    "border-l-4 overflow-visible",
                    anomaly.severity === 'HIGH' && "border-l-red-500",
                    anomaly.severity === 'MEDIUM' && "border-l-yellow-500",
                    anomaly.severity === 'LOW' && "border-l-blue-500"
                  )}>
                    <CardContent className="pt-6 overflow-visible !p-6">
                      <div className="space-y-3 min-w-0 w-full">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0 w-full">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn(
                                "px-2 py-1 rounded text-xs border",
                                getSeverityColor(anomaly.severity)
                              )}>
                                {anomaly.severity}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {t('aiCommand.confidencePercent', { percent: Math.round(anomaly.confidence * 100) })}
                              </span>
                            </div>
                            <p className="font-medium text-sm break-words w-full">{anomaly.patternDetected}</p>
                            <p className="text-xs text-muted-foreground mt-1 break-words w-full">
                              {anomaly.historicalComparison}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3 pt-2 border-t w-full">
                          <div className="min-w-0 w-full">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t('aiCommand.aiExplanation')}</p>
                            <div className="text-sm break-words whitespace-pre-wrap w-full overflow-visible" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                              {anomaly.explanation || t('aiCommand.noAnalysisAvailable')}
                            </div>
                          </div>
                          <div className="min-w-0 w-full">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t('aiCommand.businessImpact')}</p>
                            <div className="text-sm break-words whitespace-pre-wrap w-full overflow-visible" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                              {anomaly.businessImpact || t('aiCommand.noImpactInfo')}
                            </div>
                          </div>
                          <div className="min-w-0 w-full">
                            <p className="text-xs font-medium text-muted-foreground mb-1">{t('aiCommand.recommendedAction')}</p>
                            <div className="text-sm break-words whitespace-pre-wrap leading-relaxed w-full overflow-visible" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                              {anomaly.recommendedAction || t('aiCommand.noRecommendedAction')}
                            </div>
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
                <p className="text-sm text-muted-foreground">{t('aiCommand.noAnomaliesDetected')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('aiCommand.noAnomaliesDetected')}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}

