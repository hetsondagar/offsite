import { useState, useEffect } from "react";
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
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addPendingItem } from "@/store/slices/offlineSlice";
import { usePermissions } from "@/hooks/usePermissions";
import { projectList, tasks } from "@/data/dummy";

type Step = 1 | 2 | 3 | 4 | 5;

export default function DPRPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { hasPermission } = usePermissions();
  const userId = useAppSelector((state) => state.auth.userId);
  const [step, setStep] = useState<Step>(1);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Check permission
  useEffect(() => {
    if (!hasPermission("canCreateDPR")) {
      navigate("/");
    }
  }, [hasPermission, navigate]);

  const handlePhotoUpload = () => {
    // Simulate photo upload
    setPhotos([...photos, `/placeholder.svg`]);
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    // Simulate AI generation with typing effect
    await new Promise(resolve => setTimeout(resolve, 2000));
    setAiSummary(
      "Completed concrete pouring for Floor 3, Section B. Weather conditions were favorable with 28°C temperature. 15 workers on site. Used 45 bags of cement and 2 truckloads of concrete mix. Work progressed as per schedule with 85% of planned area covered. No safety incidents reported."
    );
    setIsGenerating(false);
  };

  const handleSubmit = async () => {
    if (!selectedProject || !selectedTask) return;
    
    setIsSubmitting(true);
    
    // Save to IndexedDB with user audit info
    const dprId = await saveDPR({
      projectId: selectedProject,
      taskId: selectedTask,
      photos: photos,
      notes: notes,
      aiSummary: aiSummary,
      timestamp: Date.now(),
      createdBy: userId || "unknown",
      createdAt: new Date().toISOString(),
    });
    
    // Add to Redux offline store
    dispatch(addPendingItem({
      type: 'dpr',
      data: {
        id: dprId,
        projectId: selectedProject,
        taskId: selectedTask,
        photos: photos,
        notes: notes,
        aiSummary: aiSummary,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      },
    }));
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => navigate("/"), 2000);
  };

  const stepTitles = {
    1: "Select Project",
    2: "Upload Photos",
    3: "Select Task",
    4: "Add Notes",
    5: "Review & Submit",
  };

  // Permission check
  if (!hasPermission("canCreateDPR")) {
    return (
      <MobileLayout role="engineer" hideNav>
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
    <MobileLayout role="engineer" hideNav>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={() => step > 1 ? setStep((step - 1) as Step) : navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="-ml-2">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 ml-0">
              <h1 className="font-display font-semibold text-lg">Create DPR</h1>
              <p className="text-xs text-muted-foreground">{stepTitles[step]}</p>
            </div>
            <StatusBadge status="offline" label="Offline" />
          </div>

          {/* Progress */}
          <div className="flex gap-1 mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={cn(
                  "flex-1 h-1 rounded-full transition-all duration-300",
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
                <h2 className="font-display text-2xl font-bold text-foreground">DPR Submitted!</h2>
                <p className="text-muted-foreground">Your report has been saved offline</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Step 1: Select Project */}
          {step === 1 && (
            <div className="space-y-3 animate-fade-up">
              {projectList.map((project) => (
                <Card
                  key={project.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    selectedProject === project.id && "border-primary shadow-glow-sm"
                  )}
                  onClick={() => {
                    setSelectedProject(project.id);
                    setStep(2);
                  }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-medium">{project.name}</span>
                    <ChevronDown className={cn(
                      "w-5 h-5 text-muted-foreground transition-transform",
                      selectedProject === project.id && "-rotate-90"
                    )} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step 2: Upload Photos */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-up">
              <Card variant="gradient">
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                        <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
                        <button 
                          className="absolute top-1 right-1 p-1 rounded-full bg-background/80"
                          onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 6 && (
                      <button
                        onClick={handlePhotoUpload}
                        className="aspect-square rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        <Camera className="w-6 h-6" />
                        <span className="text-xs">Add</span>
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={handlePhotoUpload}>
                      <Camera className="w-4 h-4 mr-2" />
                      Camera
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handlePhotoUpload}>
                      <Upload className="w-4 h-4 mr-2" />
                      Gallery
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setStep(3)}
                disabled={photos.length === 0}
              >
                Continue
              </Button>
            </div>
          )}

          {/* Step 3: Select Task */}
          {step === 3 && (
            <div className="space-y-3 animate-fade-up">
              {tasks.map((task) => (
                <Card
                  key={task.id}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    selectedTask === task.id && "border-primary shadow-glow-sm"
                  )}
                  onClick={() => {
                    setSelectedTask(task.id);
                    setStep(4);
                  }}
                >
                  <CardContent className="p-4 flex items-center justify-between">
                    <span className="font-medium">{task.name}</span>
                    <StatusBadge 
                      status={task.status === "completed" ? "success" : task.status === "in-progress" ? "info" : "pending"} 
                      label={task.status.replace("-", " ")} 
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step 4: Add Notes */}
          {step === 4 && (
            <div className="space-y-4 animate-fade-up">
              <Card variant="gradient">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Add Notes (Optional)</CardTitle>
                </CardHeader>
                <CardContent>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any additional notes about today's work..."
                    className="w-full h-32 p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                      <span className="text-sm font-medium text-primary">AI Generated Summary</span>
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
                Continue to Review
              </Button>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {step === 5 && (
            <div className="space-y-4 animate-fade-up">
              <Card variant="gradient">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Review DPR</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <span className="text-xs text-muted-foreground">Project</span>
                    <p className="font-medium text-foreground">
                      {projectList.find(p => p.id === selectedProject)?.name}
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-xl bg-muted/50">
                    <span className="text-xs text-muted-foreground">Task</span>
                    <p className="font-medium text-foreground">
                      {tasks.find(t => t.id === selectedTask)?.name}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-muted/50">
                    <span className="text-xs text-muted-foreground mb-2 block">Photos ({photos.length})</span>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {photos.map((photo, index) => (
                        <img 
                          key={index} 
                          src={photo} 
                          alt={`Photo ${index + 1}`}
                          className="w-16 h-16 rounded-lg object-cover shrink-0"
                        />
                      ))}
                    </div>
                  </div>

                  {(notes || aiSummary) && (
                    <div className="p-3 rounded-xl bg-muted/50">
                      <span className="text-xs text-muted-foreground">Summary</span>
                      <p className="text-sm text-foreground mt-1">
                        {aiSummary || notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-warning/10 border border-warning/30">
                <WifiOff className="w-4 h-4 text-warning shrink-0" />
                <span className="text-sm text-warning">Will sync when online</span>
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
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Submit DPR
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
