import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useAppSelector } from "@/store/hooks";
import { FileText, Image as ImageIcon, Loader2, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { projectsApi } from "@/services/api/projects";
import { dprApi } from "@/services/api/dpr";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AllDPRsPage() {
  const navigate = useNavigate();
  const { role } = useAppSelector((state) => state.auth);
  const [allDPRs, setAllDPRs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDPR, setSelectedDPR] = useState<any | null>(null);
  const [isDPRModalOpen, setIsDPRModalOpen] = useState(false);
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  useEffect(() => {
    loadAllDPRs();
  }, []);

  const loadAllDPRs = async () => {
    try {
      setIsLoading(true);
      const projectsData = await projectsApi.getAll(1, 100);
      const projects = projectsData?.projects || [];
      
      const dprsArray: any[] = [];
      for (const project of projects) {
        try {
          const dprData = await dprApi.getByProject(project._id, 1, 50);
          if (dprData?.dprs && dprData.dprs.length > 0) {
            dprsArray.push(...dprData.dprs.map((dpr: any) => ({
              ...dpr,
              projectName: project.name,
              projectId: project._id,
            })));
          }
        } catch (error) {
          console.error(`Error loading DPRs for project ${project._id}:`, error);
        }
      }
      
      dprsArray.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllDPRs(dprsArray);
    } catch (error) {
      console.error('Error loading all DPRs:', error);
      setAllDPRs([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout role={role || "manager"}>
      <div className="p-4 space-y-6 safe-area-top">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 opacity-0 animate-fade-up">
          <div className="flex justify-center w-full">
            <Logo size="xl" showText={false} />
          </div>
          
          <div className="flex items-center justify-between w-full">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <p className="text-xs text-muted-foreground">{currentDate}</p>
            <div className="flex items-center gap-2">
              <ThemeToggle variant="icon" />
              <StatusBadge status="success" label="Online" pulse />
            </div>
          </div>
        </div>

        {/* All DPRs */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-primary" />
              All Recent DPRs ({allDPRs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : allDPRs.length > 0 ? (
              allDPRs.map((dpr: any) => (
                <div 
                  key={dpr._id} 
                  className="p-3 rounded-xl bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => {
                    setSelectedDPR(dpr);
                    setIsDPRModalOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {dpr.taskId?.title || 'Task'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {dpr.projectName || 'Project'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span>By: {dpr.createdBy?.name || 'Unknown'}</span>
                        <span>{new Date(dpr.createdAt).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      {dpr.photos && dpr.photos.length > 0 && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <ImageIcon className="w-3 h-3" />
                          <span>{dpr.photos.length} photo(s)</span>
                        </div>
                      )}
                      {dpr.aiSummary && (
                        <div className="mt-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs font-medium text-primary mb-1">AI Summary</p>
                          <p className="text-xs text-foreground line-clamp-2">{dpr.aiSummary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent DPRs</p>
            )}
          </CardContent>
        </Card>

        {/* DPR Detail Modal */}
        <Dialog open={isDPRModalOpen} onOpenChange={setIsDPRModalOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>DPR Details</DialogTitle>
            </DialogHeader>
            {selectedDPR && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground">Project</span>
                  <p className="font-medium text-foreground">{selectedDPR.projectName || 'Unknown Project'}</p>
                </div>
                
                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground">Task</span>
                  <p className="font-medium text-foreground">{selectedDPR.taskId?.title || 'Unknown Task'}</p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50">
                  <span className="text-xs text-muted-foreground">Created By</span>
                  <p className="font-medium text-foreground">{selectedDPR.createdBy?.name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(selectedDPR.createdAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {selectedDPR.notes && (
                  <div className="p-3 rounded-xl bg-muted/50">
                    <span className="text-xs text-muted-foreground">Notes</span>
                    <p className="text-sm text-foreground mt-1">{selectedDPR.notes}</p>
                  </div>
                )}

                {selectedDPR.photos && selectedDPR.photos.length > 0 && (
                  <div className="p-3 rounded-xl bg-muted/50">
                    <span className="text-xs text-muted-foreground mb-2 block">Photos ({selectedDPR.photos.length})</span>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedDPR.photos.map((photo: string, index: number) => (
                        <img
                          key={index}
                          src={photo}
                          alt={`DPR photo ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedDPR.aiSummary && (
                  <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                    <span className="text-xs font-medium text-primary mb-1 block">AI Summary</span>
                    <p className="text-sm text-foreground">{selectedDPR.aiSummary}</p>
                  </div>
                )}

                {selectedDPR.workStoppage?.occurred && (
                  <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                    <span className="text-xs font-medium text-destructive mb-2 block">Work Stoppage</span>
                    <div className="space-y-1 text-sm">
                      <p><span className="text-muted-foreground">Reason:</span> {selectedDPR.workStoppage.reason?.replace('_', ' ')}</p>
                      <p><span className="text-muted-foreground">Duration:</span> {selectedDPR.workStoppage.durationHours} hours</p>
                      {selectedDPR.workStoppage.remarks && (
                        <p><span className="text-muted-foreground">Remarks:</span> {selectedDPR.workStoppage.remarks}</p>
                      )}
                      {selectedDPR.workStoppage.evidencePhotos && selectedDPR.workStoppage.evidencePhotos.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-muted-foreground">Evidence Photos:</span>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            {selectedDPR.workStoppage.evidencePhotos.map((photo: string, index: number) => (
                              <img
                                key={index}
                                src={photo}
                                alt={`Evidence ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
