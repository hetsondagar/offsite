import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ArrowLeft, FileText, Image as ImageIcon, Loader2, Calendar, User, MapPin } from "lucide-react";
import { dprApi } from "@/services/api/dpr";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { useTranslation } from "react-i18next";

export default function DPRDetailPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { role } = useAppSelector((state) => state.auth);
  const [dpr, setDpr] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadDPR();
    }
  }, [id]);

  const loadDPR = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      // Since we don't have a getById endpoint, we'll need to get it from the project
      // For now, let's try to get it from all DPRs or we can pass it via state
      // This is a limitation - we might need to add a getById endpoint
      toast.error('DPR detail loading - endpoint may need to be added');
      // TODO: Add getById endpoint to dprApi
    } catch (error: any) {
      console.error('Error loading DPR:', error);
      toast.error(t('dpr.failedToLoadDPRDetails'));
    } finally {
      setIsLoading(false);
    }
  };

  // If DPR is passed via location state, use it
  useEffect(() => {
    const state = (window.history.state as any)?.usr;
    if (state?.dpr) {
      setDpr(state.dpr);
      setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return (
      <MobileLayout role={role || "engineer"}>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  if (!dpr) {
    return (
      <MobileLayout role={role || "engineer"}>
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">DPR not found</p>
              <Button onClick={() => navigate(-1)} className="mt-4">
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout role={role || "engineer"}>
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        <PageHeader
          title={t('dpr.dprDetails')}
          subtitle={typeof dpr.projectId === 'object' && dpr.projectId?.name ? dpr.projectId.name : ''}
          showBack={true}
        />

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
          {/* Project & Task Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                {t('dpr.projectAndTask')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('dpr.project')}</p>
                <p className="font-medium text-foreground">
                  {typeof dpr.projectId === 'object' ? dpr.projectId.name : t('materials.unknown') + ' ' + t('dpr.project')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('dpr.task')}</p>
                <p className="font-medium text-foreground">
                  {typeof dpr.taskId === 'object' ? dpr.taskId.title : dpr.taskId || t('materials.unknown') + ' ' + t('dpr.task')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Created By & Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                {t('common.details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">{t('dpr.createdBy')}</p>
                <p className="font-medium text-foreground">
                  {typeof dpr.createdBy === 'object' ? dpr.createdBy.name : t('materials.unknown')}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t('dpr.date')}
                </p>
                <p className="font-medium text-foreground">
                  {new Date(dpr.createdAt).toLocaleString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {dpr.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('dpr.notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground whitespace-pre-wrap">{dpr.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Photos */}
          {dpr.photos && dpr.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  {t('dpr.addPhotos')} ({dpr.photos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {dpr.photos.map((photo: string, index: number) => (
                    <div
                      key={index}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={photo}
                        alt={`DPR photo ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Summary */}
          {dpr.aiSummary && (
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base text-primary">{t('dpr.aiSummary')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground">{dpr.aiSummary}</p>
              </CardContent>
            </Card>
          )}

          {/* Work Stoppage */}
          {dpr.workStoppage?.occurred && (
            <Card className="border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-base text-destructive">{t('dpr.workStoppage')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">{t('dpr.stoppageReason')}</p>
                  <p className="text-sm font-medium text-foreground">
                    {dpr.workStoppage.reason?.replace('_', ' ') || t('dpr.notSpecified')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('dpr.stoppageDuration')}</p>
                  <p className="text-sm font-medium text-foreground">
                    {dpr.workStoppage.durationHours} {t('dpr.hours')}
                  </p>
                </div>
                {dpr.workStoppage.remarks && (
                  <div>
                    <p className="text-xs text-muted-foreground">{t('dpr.stoppageRemarks')}</p>
                    <p className="text-sm text-foreground">{dpr.workStoppage.remarks}</p>
                  </div>
                )}
                {dpr.workStoppage.evidencePhotos && dpr.workStoppage.evidencePhotos.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('dpr.evidencePhotos')}</p>
                    <div className="grid grid-cols-2 gap-2">
                      {dpr.workStoppage.evidencePhotos.map((photo: string, index: number) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedPhoto(photo)}
                        >
                          <img
                            src={photo}
                            alt={`Evidence ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Photo Modal */}
        <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            {selectedPhoto && (
              <img
                src={selectedPhoto}
                alt={t('dpr.fullSize')}
                className="w-full h-auto max-h-[90vh] object-contain"
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
}
