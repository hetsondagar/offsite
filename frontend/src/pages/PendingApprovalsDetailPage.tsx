import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { ArrowLeft, Package, Loader2, Check, X, AlertTriangle } from "lucide-react";
import { materialsApi } from "@/services/api/materials";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/common/PageHeader";
import { useTranslation } from "react-i18next";

export default function PendingApprovalsDetailPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setIsLoading(true);
      const data = await materialsApi.getPending(1, 100);
      const pending = (data?.requests || []).filter((r: any) => r.status === 'pending');
      setPendingRequests(pending);
    } catch (error: any) {
      console.error('Error loading pending approvals:', error);
      toast.error(t('materials.failedToLoadPendingApprovals'));
      setPendingRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!hasPermission('canApproveMaterialRequests')) {
      toast.error(t('materials.noPermissionToApprove'));
      return;
    }

    setProcessingId(id);
    try {
      await materialsApi.approve(id);
      toast.success(t('materials.requestApprovedSuccess'));
      loadPendingApprovals();
    } catch (error: any) {
      console.error('Error approving request:', error);
      toast.error(error.message || t('materials.failedToApprove'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (!hasPermission('canApproveMaterialRequests')) {
      toast.error('You do not have permission to reject requests');
      return;
    }

    if (!reason.trim()) {
      toast.error(t('materials.pleaseProvideRejectionReason'));
      return;
    }

    setProcessingId(id);
    try {
      await materialsApi.reject(id, reason);
      toast.success(t('materials.requestRejected'));
      loadPendingApprovals();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      toast.error(error.message || t('materials.failedToReject'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <MobileLayout role="manager">
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        <PageHeader
          title={t('materials.pendingApprovals')}
          subtitle={`${pendingRequests.length} ${pendingRequests.length !== 1 ? t('materials.pendingRequests') : t('materials.requestMaterial')} ${t('attendance.pending')}`}
          showBack={true}
        />

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">{t('materials.noPendingApprovals')}</p>
              </CardContent>
            </Card>
          ) : (
            pendingRequests.map((request: any) => (
              <Card key={request._id} className="animate-fade-up">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        {request.materialName}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t('materials.project')}: {typeof request.projectId === 'object' ? request.projectId.name : t('materials.unknown')}
                      </p>
                    </div>
                    <StatusBadge status="pending" label={t('status.pending')} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{t('materials.quantity')}</p>
                      <p className="font-medium text-foreground">{request.quantity} {request.unit}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Requested By</p>
                      <p className="font-medium text-foreground">
                        {typeof request.requestedBy === 'object' ? request.requestedBy.name : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t('materials.date')}</p>
                      <p className="font-medium text-foreground">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {request.estimatedCost && (
                      <div>
                        <p className="text-xs text-muted-foreground">{t('materials.estimatedCost')}</p>
                        <p className="font-medium text-foreground">₹{request.estimatedCost.toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  {request.reason && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t('materials.reason')}</p>
                      <p className="text-sm text-foreground bg-muted/50 p-2 rounded-lg">{request.reason}</p>
                    </div>
                  )}

                  {request.anomalyDetected && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-destructive">{t('materials.anomalyDetected')}</p>
                          <p className="text-xs text-muted-foreground mt-1">{request.anomalyReason}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {hasPermission('canApproveMaterialRequests') && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApprove(request._id)}
                        disabled={processingId === request._id}
                      >
                        {processingId === request._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            {t('materials.approve')}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          const reason = prompt(t('materials.pleaseProvideRejectionReason') + ':');
                          if (reason) {
                            handleReject(request._id, reason);
                          }
                        }}
                        disabled={processingId === request._id}
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t('materials.reject')}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
