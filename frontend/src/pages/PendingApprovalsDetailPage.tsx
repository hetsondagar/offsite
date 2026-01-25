import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { Package, Loader2, Check, X, AlertTriangle, Receipt } from "lucide-react";
import { materialsApi } from "@/services/api/materials";
import { pettyCashApi, type PettyCash } from "@/services/api/petty-cash";
import { toast } from "sonner";
import { usePermissions } from "@/hooks/usePermissions";
import { PageHeader } from "@/components/common/PageHeader";
import { useTranslation } from "react-i18next";

export default function PendingApprovalsDetailPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [pendingReimbursements, setPendingReimbursements] = useState<PettyCash[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadPendingApprovals();
  }, []);

  const loadPendingApprovals = async () => {
    try {
      setIsLoading(true);

      const [materialsData, pettyCashData] = await Promise.all([
        materialsApi.getPending(1, 100),
        hasPermission('canApprovePettyCash') ? pettyCashApi.getPendingExpenses() : Promise.resolve([] as PettyCash[]),
      ]);

      const pendingMaterials = (materialsData?.requests || []).filter((r: any) => r.status === 'pending');
      setPendingRequests(pendingMaterials);
      setPendingReimbursements(pettyCashData || []);
    } catch (error: any) {
      console.error('Error loading pending approvals:', error);
      toast.error(t('materials.failedToLoadPendingApprovals'));
      setPendingRequests([]);
      setPendingReimbursements([]);
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

  const handleApproveReimbursement = async (id: string) => {
    if (!hasPermission('canApprovePettyCash')) {
      toast.error('You do not have permission to approve reimbursements');
      return;
    }

    setProcessingId(id);
    try {
      await pettyCashApi.approveExpense(id);
      toast.success('Reimbursement approved');
      loadPendingApprovals();
    } catch (error: any) {
      console.error('Error approving reimbursement:', error);
      toast.error(error.message || 'Failed to approve reimbursement');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReimbursement = async (id: string, reason: string) => {
    if (!hasPermission('canApprovePettyCash')) {
      toast.error('You do not have permission to reject reimbursements');
      return;
    }

    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessingId(id);
    try {
      await pettyCashApi.rejectExpense(id, reason);
      toast.success('Reimbursement rejected');
      loadPendingApprovals();
    } catch (error: any) {
      console.error('Error rejecting reimbursement:', error);
      toast.error(error.message || 'Failed to reject reimbursement');
    } finally {
      setProcessingId(null);
    }
  };

  const totalPending = pendingRequests.length + pendingReimbursements.length;

  return (
    <MobileLayout role="manager">
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        <PageHeader
          title={t('Pending Approvals')}
          subtitle={`${totalPending} pending`}
          showBack={true}
        />

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : totalPending === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">{t('materials.noPendingApprovals')}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Reimbursements */}
              {pendingReimbursements.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground">Reimbursements</h2>
                  {pendingReimbursements.map((expense) => (
                    <Card key={expense._id} className="animate-fade-up">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Receipt className="w-4 h-4 text-primary" />
                              ₹{expense.amount?.toLocaleString?.() ?? expense.amount} • {expense.category}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {expense.projectId && typeof expense.projectId === 'object' ? expense.projectId.name : 'Project'}
                              {expense.submittedBy && typeof expense.submittedBy === 'object' && expense.submittedBy.name
                                ? ` • ${expense.submittedBy.name}`
                                : ''}
                            </p>
                          </div>
                          <StatusBadge status="pending" label="PENDING" />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {expense.description && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Description</p>
                            <p className="text-sm text-foreground bg-muted/50 p-2 rounded-lg">{expense.description}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Date</p>
                            <p className="font-medium text-foreground">
                              {expense.createdAt ? new Date(expense.createdAt).toLocaleDateString() : '-'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Location</p>
                            <p className="font-medium text-foreground">
                              {expense.geoLocation ||
                                (expense.coordinates
                                  ? `${expense.coordinates.latitude.toFixed(5)}, ${expense.coordinates.longitude.toFixed(5)}`
                                  : '-')}
                            </p>
                          </div>
                        </div>

                        {expense.receiptPhotoUrl && (
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground">Receipt</p>
                            <div className="flex items-center gap-3">
                              <img
                                src={expense.receiptPhotoUrl}
                                alt="Receipt"
                                className="w-16 h-16 rounded-md object-cover border"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <a
                                href={expense.receiptPhotoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sm text-primary underline"
                              >
                                View receipt photo
                              </a>
                            </div>
                          </div>
                        )}

                        {hasPermission('canApprovePettyCash') && (
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={() => handleApproveReimbursement(expense._id)}
                              disabled={processingId === expense._id}
                            >
                              {processingId === expense._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-2" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => {
                                const reason = prompt('Please provide a rejection reason:');
                                if (reason) {
                                  handleRejectReimbursement(expense._id, reason);
                                }
                              }}
                              disabled={processingId === expense._id}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Material Requests */}
              {pendingRequests.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground">Material Requests</h2>
                  {pendingRequests.map((request: any) => (
                    <Card key={request._id} className="animate-fade-up">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base flex items-center gap-2">
                              <Package className="w-4 h-4 text-primary" />
                              {request.materialName}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                              {t('materials.project')}: {request.projectId && typeof request.projectId === 'object' ? request.projectId.name : t('materials.unknown')}
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
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
