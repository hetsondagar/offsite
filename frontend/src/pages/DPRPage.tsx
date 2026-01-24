import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  Sparkles, 
  Check, 
  ChevronDown,
  Image as ImageIcon,
  X,
  Loader2,
  WifiOff,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { saveDPR } from "@/lib/indexeddb";
import { isOnline as checkOnline } from "@/lib/network";
import { useAppSelector } from "@/store/hooks";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { projectsApi } from "@/services/api/projects";
import { tasksApi } from "@/services/api/tasks";
import { dprApi } from "@/services/api/dpr";
import { pickImages } from "@/lib/capacitor-camera";
import { insightsApi } from "@/services/api/insights";
import { PageHeader } from "@/components/common/PageHeader";
import { Label } from "@/components/ui/label";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

export default function DPRPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const userId = useAppSelector((state) => state.auth.userId);
  const { isOnline } = useAppSelector((state) => state.offline);
  const [step, setStep] = useState<Step>(1);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [oldDPRs, setOldDPRs] = useState<any[]>([]);
  const [isLoadingOldDPRs, setIsLoadingOldDPRs] = useState(false);
  const [showOldDPRs, setShowOldDPRs] = useState(false);
  const [submittedDPRId, setSubmittedDPRId] = useState<string | null>(null);
  const [submittedDPR, setSubmittedDPR] = useState<any>(null);
  const [dprAISummary, setDprAISummary] = useState<string>("");
  
  // Work stoppage state
  const [workStoppageOccurred, setWorkStoppageOccurred] = useState(false);
  const [workStoppageReason, setWorkStoppageReason] = useState<string>("");
  const [workStoppageDuration, setWorkStoppageDuration] = useState<number>(0);
  const [workStoppageRemarks, setWorkStoppageRemarks] = useState("");
  const [workStoppageEvidencePhotos, setWorkStoppageEvidencePhotos] = useState<File[]>([]);
  const [workStoppageEvidencePreviews, setWorkStoppageEvidencePreviews] = useState<string[]>([]);

  // Check permission
  useEffect(() => {
    if (!hasPermission("canCreateDPR")) {
      navigate("/");
    }
  }, [hasPermission, navigate]);

  // Load projects
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true);
        const data = await projectsApi.getAll(1, 100);
        setProjects(data?.projects || []);
      } catch (error) {
        console.error('Error loading projects:', error);
      } finally {
        setIsLoadingProjects(false);
      }
    };
    loadProjects();
  }, []);

  // Load tasks when project is selected
  useEffect(() => {
    const loadTasks = async () => {
      if (!selectedProject) {
        setTasks([]);
        return;
      }
      try {
        setIsLoadingTasks(true);
        const data = await tasksApi.getAll(selectedProject);
        setTasks(data || []);
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setIsLoadingTasks(false);
      }
    };
    loadTasks();
  }, [selectedProject]);

  const handlePhotoUpload = async (source: 'camera' | 'gallery' = 'gallery') => {
    try {
      const files = await pickImages({ quality: 90, source });
      
      if (files.length + photos.length > 6) {
        toast.error(t('dpr.maxPhotos'));
        return;
      }
      
      const newPhotos = [...photos, ...files];
      setPhotos(newPhotos);
      
      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          setPhotoPreviews((prev) => [...prev, e.target.result]);
        };
        reader.readAsDataURL(file);
      });
    } catch (error: any) {
      console.error('Photo upload error:', error);
      if (error.message?.includes('permission')) {
        toast.error(error.message);
      } else if (error.message && !error.message.includes('User cancelled')) {
        toast.error('Failed to capture photo. Please try again.');
      }
      // User cancelled - silently fail
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      // AI summary will be generated by backend when generateAISummary is true
      // For now, we'll just enable it for submission
      setAiSummary("AI summary will be generated upon submission");
    } catch (error) {
      console.error('Error generating AI summary:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWorkStoppagePhotoUpload = async (source: 'camera' | 'gallery' = 'gallery') => {
    try {
      const files = await pickImages({ quality: 90, source });
      setWorkStoppageEvidencePhotos(prev => [...prev, ...files]);
      
      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          setWorkStoppageEvidencePreviews(prev => [...prev, e.target.result]);
        };
        reader.readAsDataURL(file);
      });
    } catch (error: any) {
      console.error('Work stoppage photo upload error:', error);
      if (error.message?.includes('permission')) {
        toast.error(error.message);
      } else if (error.message && !error.message.includes('User cancelled')) {
        toast.error('Failed to capture photo. Please try again.');
      }
      // User cancelled - silently fail
    }
  };

  const loadOldDPRs = async (projectId: string) => {
    try {
      setIsLoadingOldDPRs(true);
      const data = await dprApi.getByProject(projectId, 1, 20);
      setOldDPRs(data?.dprs || []);
      setShowOldDPRs(true);
    } catch (error) {
      console.error('Error loading old DPRs:', error);
      setOldDPRs([]);
    } finally {
      setIsLoadingOldDPRs(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedProject || !selectedTask) return;
    if (workStoppageOccurred && (!workStoppageReason || workStoppageDuration <= 0)) {
      alert('Please provide reason and duration for work stoppage');
      return;
    }

    const workStoppage = workStoppageOccurred
      ? {
          occurred: true,
          reason: workStoppageReason as any,
          durationHours: workStoppageDuration,
          remarks: workStoppageRemarks || undefined,
          evidencePhotos: [] as string[],
        }
      : { occurred: false };

    const photoBase64: string[] = [];
    for (const photo of photos) {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = (e: any) => resolve(e.target.result);
        r.readAsDataURL(photo);
      });
      photoBase64.push(base64);
    }
    const stoppageEvidenceBase64: string[] = [];
    for (const photo of workStoppageEvidencePhotos) {
      const base64 = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = (e: any) => resolve(e.target.result);
        r.readAsDataURL(photo);
      });
      stoppageEvidenceBase64.push(base64);
    }
    const workStoppageData = workStoppageOccurred
      ? {
          occurred: true,
          reason: workStoppageReason,
          durationHours: workStoppageDuration,
          remarks: workStoppageRemarks || undefined,
          evidencePhotos: stoppageEvidenceBase64,
        }
      : { occurred: false };

    setIsSubmitting(true);
    try {
      const online = await checkOnline();

      if (!online) {
        await saveDPR({
          projectId: selectedProject,
          taskId: selectedTask,
          photos: photoBase64,
          notes: notes,
          aiSummary: aiSummary,
          workStoppage: workStoppageData as any,
          timestamp: Date.now(),
          createdBy: userId || "unknown",
        });
        toast.success(t('dpr.savedOffline') || 'Saved offline. Will sync automatically.');
        setShowSuccess(true);
        setTimeout(() => navigate("/"), 2000);
        return;
      }

      const response = await dprApi.create(
        {
          projectId: selectedProject,
          taskId: selectedTask,
          notes,
          generateAISummary: true,
          workStoppage: workStoppage as any,
        },
        photos.length > 0 ? photos : undefined,
        workStoppageEvidencePhotos.length > 0 ? workStoppageEvidencePhotos : undefined
      );

      if (response?._id) {
        setSubmittedDPRId(response._id);
        setSubmittedDPR(response);
        if (response.aiSummary) setDprAISummary(response.aiSummary);
        else {
          try {
            const aiSummaryData = await insightsApi.getDPRSummary(selectedProject, response._id);
            if (aiSummaryData?.summary) setDprAISummary(aiSummaryData.summary);
          } catch (e) {
            console.error('Error loading AI summary:', e);
          }
        }
        await loadOldDPRs(selectedProject);
      }
      setShowSuccess(true);
    } catch (err) {
      await saveDPR({
        projectId: selectedProject,
        taskId: selectedTask,
        photos: photoBase64,
        notes: notes,
        aiSummary: aiSummary,
        workStoppage: workStoppageData as any,
        timestamp: Date.now(),
        createdBy: userId || "unknown",
      });
      toast.warning(t('dpr.savedOfflineWarning') || 'Saved offline. Will sync when connection is restored.');
      setShowSuccess(true);
      setTimeout(() => navigate("/"), 2000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepTitles = {
    1: t("dpr.step1"),
    2: t("dpr.step3"),
    3: t("dpr.step2"),
    4: t("dpr.step4"),
    5: t("dpr.step5"),
    6: t("dpr.step6"),
  };

  // Permission check
  if (!hasPermission("canCreateDPR")) {
    return (
      <MobileLayout role="engineer">
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Access Denied
              </h2>
              <p className="text-sm text-muted-foreground">
                You don't have permission to create DPRs. Only Site Engineers can create Daily Progress Reports.
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
    <MobileLayout role="engineer">
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 safe-area-top">
          <PageHeader
            title={t("dpr.createDPR")}
            subtitle={stepTitles[step]}
            showBack={true}
            rightAction={<StatusBadge status={isOnline ? "success" : "offline"} label={isOnline ? "Online" : "Offline"} />}
          />
          
          {/* Progress */}
          <div className="flex gap-1 px-4 pb-3">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all duration-300",
                  s <= step ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>

        {/* Success Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center space-y-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-20 h-20 mx-auto rounded-full bg-success/20 flex items-center justify-center"
                >
                  <Check className="w-10 h-10 text-success" />
                </motion.div>
                <h2 className="font-display text-2xl font-bold text-foreground">{t('dpr.dprSubmitted')}</h2>
                <p className="text-muted-foreground">
                  {isOnline ? t('dpr.reportSavedSuccess') : t('dpr.reportSavedOffline')}
                </p>
                
                {/* Show Created DPR Details */}
                {submittedDPR && (
                  <Card className="mt-4 max-w-md mx-auto border-primary/30">
                    <CardHeader>
                      <CardTitle className="text-base">{t('dpr.yourDPR')}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {t('dpr.created')}: {new Date(submittedDPR.createdAt).toLocaleString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Project and Task */}
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('dpr.project')}</p>
                        <p className="text-sm font-medium text-foreground">
                          {typeof submittedDPR.projectId === 'object' ? submittedDPR.projectId?.name : t('dpr.project')}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('dpr.task')}</p>
                        <p className="text-sm font-medium text-foreground">
                          {typeof submittedDPR.taskId === 'object' ? submittedDPR.taskId?.title : t('dpr.task')}
                        </p>
                      </div>
                      
                      {/* Notes */}
                      {submittedDPR.notes && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">{t('dpr.notes')}</p>
                          <p className="text-sm text-foreground">{submittedDPR.notes}</p>
                        </div>
                      )}
                      
                      {/* Photos */}
                      {submittedDPR.photos && submittedDPR.photos.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">{t('dpr.addPhotos')} ({submittedDPR.photos.length})</p>
                          <div className="grid grid-cols-3 gap-2">
                            {submittedDPR.photos.slice(0, 6).map((photo: string, idx: number) => (
                              <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-border">
                                <img 
                                  src={photo} 
                                  alt={`DPR photo ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Work Stoppage */}
                      {submittedDPR.workStoppage?.occurred && (
                        <div className="p-3 rounded-lg bg-warning/10 border border-warning/30 space-y-2">
                          <p className="text-xs font-medium text-warning">{t('dpr.workStoppageReported')}</p>
                          <div className="space-y-1 text-xs">
                            <p><span className="text-muted-foreground">{t('dpr.stoppageReason')}:</span> {submittedDPR.workStoppage.reason?.replace('_', ' ').toLowerCase()}</p>
                            <p><span className="text-muted-foreground">{t('dpr.stoppageDuration')}:</span> {submittedDPR.workStoppage.durationHours} {t('dpr.hours')}</p>
                            {submittedDPR.workStoppage.remarks && (
                              <p><span className="text-muted-foreground">{t('dpr.stoppageRemarks')}:</span> {submittedDPR.workStoppage.remarks}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* AI Summary */}
                      {dprAISummary && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <p className="text-xs font-medium text-primary">{t('dpr.aiSummary')}</p>
                          </div>
                          <p className="text-sm text-foreground">{dprAISummary}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                <div className="mt-4 space-y-2 max-w-md mx-auto">
                  {oldDPRs.length > 0 && (
                    <Button 
                      onClick={() => {
                        setShowSuccess(false);
                        setShowOldDPRs(true);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      View All DPRs ({oldDPRs.length + 1})
                    </Button>
                  )}
                  <Button 
                    onClick={() => {
                      setShowSuccess(false);
                      // Reset form
                      setStep(1);
                      setSelectedProject(null);
                      setSelectedTask(null);
                      setPhotos([]);
                      setPhotoPreviews([]);
                      setNotes("");
                      setAiSummary("");
                      setDprAISummary("");
                      setWorkStoppageOccurred(false);
                      setWorkStoppageReason("");
                      setWorkStoppageDuration(0);
                      setWorkStoppageRemarks("");
                      setWorkStoppageEvidencePhotos([]);
                      setWorkStoppageEvidencePreviews([]);
                      setSubmittedDPRId(null);
                      setSubmittedDPR(null);
                    }}
                    className="w-full"
                  >
                    Create New DPR
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Old DPRs View */}
        {showOldDPRs && !showSuccess && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-semibold">Previous DPRs</h2>
              <Button variant="ghost" size="sm" onClick={() => {
                setShowOldDPRs(false);
                setStep(1);
              }}>
                Create New
              </Button>
            </div>
            {isLoadingOldDPRs ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : oldDPRs.length > 0 || submittedDPR ? (
              <div className="space-y-3">
                {/* Show newly created DPR first if available */}
                {submittedDPR && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium">{typeof submittedDPR.taskId === 'object' ? submittedDPR.taskId?.title : t('dpr.task')}</p>
                              <StatusBadge status="success" label={t('dpr.justCreated')} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(submittedDPR.createdAt).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {submittedDPR.aiSummary && (
                            <StatusBadge status="success" label="AI Summary" />
                          )}
                        </div>
                        {submittedDPR.notes && (
                          <p className="text-sm text-foreground">{submittedDPR.notes}</p>
                        )}
                        {submittedDPR.photos && submittedDPR.photos.length > 0 && (
                          <div className="grid grid-cols-3 gap-2">
                            {submittedDPR.photos.slice(0, 6).map((photo: string, idx: number) => (
                              <div key={idx} className="aspect-square rounded-lg overflow-hidden border border-border">
                                <img 
                                  src={photo} 
                                  alt={`DPR photo ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                        {submittedDPR.workStoppage?.occurred && (
                          <div className="p-2 rounded-lg bg-warning/10 border border-warning/30">
                            <p className="text-xs font-medium text-warning">{t('dpr.workStoppage')}: {submittedDPR.workStoppage.reason?.replace('_', ' ').toLowerCase()} ({submittedDPR.workStoppage.durationHours}h)</p>
                          </div>
                        )}
                        {dprAISummary && (
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <p className="text-xs font-medium text-primary">{t('dpr.aiSummary')}</p>
                            </div>
                            <p className="text-sm text-foreground">{dprAISummary}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {oldDPRs.map((dpr: any) => (
                  <Card key={dpr._id}>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{dpr.taskId?.title || 'Task'}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(dpr.createdAt).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {dpr.aiSummary && (
                            <StatusBadge status="success" label="AI Summary" />
                          )}
                        </div>
                        {dpr.notes && (
                          <p className="text-sm text-foreground">{dpr.notes}</p>
                        )}
                        {dpr.aiSummary && (
                          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-center gap-2 mb-2">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <p className="text-xs font-medium text-primary">{t('dpr.aiSummary')}</p>
                            </div>
                            <p className="text-sm text-foreground">{dpr.aiSummary}</p>
                          </div>
                        )}
                        {dpr.photos && dpr.photos.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ImageIcon className="w-3 h-3" />
                            <span>{dpr.photos.length} photo(s)</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-8">
                  <p className="text-sm text-muted-foreground">{t('dpr.noPreviousDPRs')}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-4 w-full overflow-x-hidden max-w-full">
          {/* Step 1: Select Project */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-up">
              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : projects.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">{t('dpr.noProjectsAvailable')}</p>
                  </CardContent>
                </Card>
              ) : (
                projects.map((project) => (
                  <Card
                    key={project._id}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      selectedProject === project._id && "border-primary shadow-glow-sm"
                    )}
                    onClick={() => {
                      setSelectedProject(project._id);
                      setStep(2);
                    }}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="font-medium">{project.name}</span>
                      <ChevronDown className={cn(
                        "w-5 h-5 text-muted-foreground transition-transform",
                        selectedProject === project._id && "-rotate-90"
                      )} />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Step 2: Upload Photos */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-up">
              <Card variant="gradient">
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {photoPreviews.map((preview, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                        <img src={preview} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        <button 
                          className="absolute top-1 right-1 p-1 rounded-full bg-background/80"
                          onClick={() => {
                            setPhotos(photos.filter((_, i) => i !== index));
                            setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 6 && (
                      <button
                        onClick={() => handlePhotoUpload('camera')}
                        className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="text-xs">Add</span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => handlePhotoUpload('camera')}>
                      <Camera className="w-4 h-4 mr-2" />
                      {t('dpr.camera')}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => handlePhotoUpload('gallery')}>
                      <Upload className="w-4 h-4 mr-2" />
                      {t('dpr.gallery')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setStep(3)}
                disabled={photos.length === 0 || !selectedProject}
              >
                {t('dpr.continue')}
              </Button>
            </div>
          )}

          {/* Step 3: Select Task */}
          {step === 3 && (
            <div className="space-y-3 animate-fade-up">
              {isLoadingTasks ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : tasks.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">{t('dpr.noTasksAvailable')}</p>
                  </CardContent>
                </Card>
              ) : (
                tasks.map((task) => (
                  <Card
                    key={task._id}
                    className={cn(
                      "cursor-pointer transition-all duration-200",
                      selectedTask === task._id && "border-primary shadow-glow-sm"
                    )}
                    onClick={() => {
                      setSelectedTask(task._id);
                      setStep(4);
                    }}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <span className="font-medium">{task.title}</span>
                      <StatusBadge 
                        status={task.status === "completed" ? "success" : task.status === "in-progress" ? "info" : "pending"} 
                        label={task.status.replace("-", " ")} 
                      />
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Step 4: Add Notes */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-up">
              <Card variant="gradient">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('dpr.step4')}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{t('dpr.notesPlaceholder')}</p>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="notes-textarea" className="sr-only">Notes</Label>
                  <textarea
                    id="notes-textarea"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('dpr.notesPlaceholder')}
                    className="w-full h-32 p-4 rounded-xl bg-background border border-border text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
                  />
                </CardContent>
              </Card>

              {/* AI Generate Button */}
              <Button
                variant="outline"
                className="w-full border-primary/50 text-primary"
                onClick={handleGenerateAI}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Summary
                  </>
                )}
              </Button>

              {aiSummary && (
                <Card variant="glow" className="animate-fade-up">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-primary">{t('dpr.aiSummary')}</span>
                    </div>
                    <textarea
                      value={aiSummary}
                      onChange={(e) => setAiSummary(e.target.value)}
                      className="w-full h-32 p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </CardContent>
                </Card>
              )}

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setStep(5)}
              >
                {t('dpr.continue')}
              </Button>
            </div>
          )}

          {/* Step 5: Work Stoppage */}
          {step === 5 && (
            <div className="space-y-4 animate-fade-up">
              <Card variant="gradient">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Work Stoppage</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Was work stopped or significantly slowed today?
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Button
                      variant={workStoppageOccurred ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setWorkStoppageOccurred(true)}
                    >
                      Yes
                    </Button>
                    <Button
                      variant={!workStoppageOccurred ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => {
                        setWorkStoppageOccurred(false);
                        setWorkStoppageReason("");
                        setWorkStoppageDuration(0);
                        setWorkStoppageRemarks("");
                        setWorkStoppageEvidencePhotos([]);
                        setWorkStoppageEvidencePreviews([]);
                      }}
                    >
                      No
                    </Button>
                  </div>

                  {workStoppageOccurred && (
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Reason *
                        </label>
                        <select
                          value={workStoppageReason}
                          onChange={(e) => setWorkStoppageReason(e.target.value)}
                          className="w-full p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                          required
                        >
                          <option value="">{t('dpr.selectReason')}</option>
                          <option value="MATERIAL_DELAY">{t('dpr.materialDelay')}</option>
                          <option value="LABOUR_SHORTAGE">{t('dpr.labourShortage')}</option>
                          <option value="WEATHER">{t('dpr.weather')}</option>
                          <option value="MACHINE_BREAKDOWN">{t('dpr.machineBreakdown')}</option>
                          <option value="APPROVAL_PENDING">{t('dpr.approvalPending')}</option>
                          <option value="SAFETY_ISSUE">{t('dpr.safetyIssue')}</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          {t('dpr.durationHours')} *
                        </label>
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          value={workStoppageDuration || ""}
                          onChange={(e) => setWorkStoppageDuration(parseFloat(e.target.value) || 0)}
                          placeholder="e.g., 2.5"
                          className="bg-muted/50 text-foreground"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          {t('dpr.stoppageRemarks')} ({t('projects.optional')})
                        </label>
                        <textarea
                          value={workStoppageRemarks}
                          onChange={(e) => setWorkStoppageRemarks(e.target.value)}
                          placeholder={t('dpr.stoppageRemarks')}
                          className="w-full h-24 p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Evidence Photos (Optional)
                        </label>
                        <div className="flex gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleWorkStoppagePhotoUpload('camera')}
                          >
                            <Camera className="w-4 h-4 mr-2" />
                            Camera
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleWorkStoppagePhotoUpload('gallery')}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Gallery
                          </Button>
                        </div>
                        {workStoppageEvidencePreviews.length > 0 && (
                          <div className="flex gap-2 mt-3 overflow-x-auto pb-2 w-full max-w-full">
                            {workStoppageEvidencePreviews.map((preview, index) => (
                              <div key={index} className="relative shrink-0">
                                <img 
                                  src={preview} 
                                  alt={`Evidence ${index + 1}`}
                                  className="w-16 h-16 rounded-lg object-cover shrink-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setWorkStoppageEvidencePhotos(prev => prev.filter((_, i) => i !== index));
                                    setWorkStoppageEvidencePreviews(prev => prev.filter((_, i) => i !== index));
                                  }}
                                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button 
                className="w-full" 
                size="lg"
                onClick={() => {
                  if (workStoppageOccurred && (!workStoppageReason || workStoppageDuration <= 0)) {
                    alert('Please provide reason and duration for work stoppage');
                    return;
                  }
                  setStep(6);
                }}
              >
                {t('dpr.continue')}
              </Button>
            </div>
          )}

          {/* Step 6: Review & Submit */}
          {step === 6 && (
            <div className="space-y-4 animate-fade-up">
              <Card variant="gradient">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t('dpr.reviewSubmit')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <span className="text-xs text-muted-foreground">{t('dpr.project')}</span>
                    <p className="font-medium text-foreground">
                      {projects.find(p => p._id === selectedProject)?.name || t('materials.unknown') + ' ' + t('dpr.project')}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-muted/50">
                    <span className="text-xs text-muted-foreground">{t('dpr.task')}</span>
                    <p className="font-medium text-foreground">
                      {tasks.find(t => t._id === selectedTask)?.title || t('materials.unknown') + ' ' + t('dpr.task')}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/50 w-full overflow-x-hidden">
                    <span className="text-xs text-muted-foreground mb-2 block">{t('dpr.addPhotos')} ({photos.length})</span>
                    <div className="flex gap-2 overflow-x-auto pb-2 w-full max-w-full">
                      {photoPreviews.map((preview, index) => (
                        <img 
                          key={index} 
                          src={preview} 
                          alt={`Photo ${index + 1}`}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      ))}
                    </div>
                  </div>

                  {(notes || aiSummary) && (
                    <div className="p-3 rounded-xl bg-muted/50">
                      <span className="text-xs text-muted-foreground">{t('dpr.aiSummary')}</span>
                      <p className="text-sm text-foreground mt-1">
                        {aiSummary || notes}
                      </p>
                    </div>
                  )}

                  {workStoppageOccurred && (
                    <div className="p-3 rounded-xl bg-warning/10 border border-warning/30">
                      <span className="text-xs text-warning font-medium mb-2 block">Work Stoppage Reported</span>
                      <div className="space-y-1 text-sm">
                        <p className="text-foreground">
                          <span className="text-muted-foreground">Reason:</span> {workStoppageReason.replace('_', ' ')}
                        </p>
                        <p className="text-foreground">
                          <span className="text-muted-foreground">Duration:</span> {workStoppageDuration} hours
                        </p>
                        {workStoppageRemarks && (
                          <p className="text-foreground">
                            <span className="text-muted-foreground">Remarks:</span> {workStoppageRemarks}
                          </p>
                        )}
                        {workStoppageEvidencePreviews.length > 0 && (
                          <div className="mt-2">
                            <span className="text-muted-foreground text-xs">Evidence Photos: {workStoppageEvidencePreviews.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30">
                <WifiOff className="w-4 h-4 text-warning shrink-0" />
                <span className="text-sm text-warning">{t('dpr.willSyncWhenOnline')}</span>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                variant="glow"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t('dpr.submitting')}
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {t('dpr.submit')}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
