import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { materialsApi } from "@/services/api/materials";
import { Loader2 } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAppSelector } from "@/store/hooks";
import { AlertCircle } from "lucide-react";
import { 
  ArrowLeft, 
  Package, 
  Check,
  X,
  AlertTriangle,
  ChevronRight,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Approval {
  id: string;
  type: "material" | "expense" | "leave";
  title: string;
  description: string;
  requestedBy: string;
  project: string;
  date: string;
  quantity?: number;
  unit?: string;
  isAnomaly?: boolean;
  anomalyReason?: string;
  status: "pending" | "approved" | "rejected";
  delayHours?: number;
  delayDays?: number;
  delaySeverity?: 'normal' | 'warning' | 'critical';
}

export default function ApprovalsPage() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const userId = useAppSelector((state) => state.auth.userId);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Load pending approvals
  useEffect(() => {
    const loadApprovals = async () => {
      try {
        setIsLoading(true);
        const data = await materialsApi.getPending(1, 100);
        const requests = data?.requests || [];
        
        // Transform to approval format
        const pending = requests
          .filter((r: any) => r.status === 'pending')
          .map((r: any) => {
            // Calculate approval delay
            const now = new Date();
            const requestedAt = new Date(r.createdAt);
            const delayMs = now.getTime() - requestedAt.getTime();
            const delayHours = Math.floor(delayMs / (1000 * 60 * 60));
            const delayDays = Math.floor(delayHours / 24);
            
            let delaySeverity: 'normal' | 'warning' | 'critical' = 'normal';
            if (delayHours >= 24) {
              delaySeverity = 'critical';
            } else if (delayHours >= 6) {
              delaySeverity = 'warning';
            }
            
            return {
              id: r._id,
              type: 'material' as const,
              title: r.materialName,
              description: `Quantity: ${r.quantity} ${r.unit}`,
              requestedBy: typeof r.requestedBy === 'object' ? r.requestedBy.name : 'Unknown',
              project: typeof r.projectId === 'object' ? r.projectId.name : 'Unknown',
              date: new Date(r.createdAt).toLocaleDateString(),
              quantity: r.quantity,
              unit: r.unit,
              isAnomaly: r.anomalyDetected,
              anomalyReason: r.anomalyReason,
              status: r.status,
              delayHours: r.delayHours || delayHours, // Use from API if available
              delayDays: r.delayDays || delayDays,
              delaySeverity: r.delaySeverity || delaySeverity,
            };
          });
        
        const historyData = requests
          .filter((r: any) => r.status !== 'pending')
          .map((r: any) => ({
            id: r._id,
            type: 'material' as const,
            title: r.materialName,
            description: `Quantity: ${r.quantity} ${r.unit}`,
            requestedBy: typeof r.requestedBy === 'object' ? r.requestedBy.name : 'Unknown',
            project: typeof r.projectId === 'object' ? r.projectId.name : 'Unknown',
            date: new Date(r.createdAt).toLocaleDateString(),
            quantity: r.quantity,
            unit: r.unit,
            status: r.status,
          }));
        
        setApprovals(pending);
        setHistory(historyData);
      } catch (error) {
        console.error('Error loading approvals:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadApprovals();
  }, []);

  const handleApprove = async (id: string) => {
    if (!hasPermission("canApproveMaterialRequests")) return;
    
    try {
      await materialsApi.approve(id);
      // Reload approvals
      const data = await materialsApi.getPending(1, 100);
      const requests = data?.requests || [];
      const pending = requests
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => ({
          id: r._id,
          type: 'material' as const,
          title: r.materialName,
          description: `Quantity: ${r.quantity} ${r.unit}`,
          requestedBy: typeof r.requestedBy === 'object' ? r.requestedBy.name : 'Unknown',
          project: typeof r.projectId === 'object' ? r.projectId.name : 'Unknown',
          date: new Date(r.createdAt).toLocaleDateString(),
          quantity: r.quantity,
          unit: r.unit,
          isAnomaly: r.anomalyDetected,
          anomalyReason: r.anomalyReason,
          status: r.status,
        }));
      setApprovals(pending);
    } catch (error) {
      console.error('Error approving request:', error);
    }
    
    const approval = approvals.find(a => a.id === id);
    if (approval) {
      // Prevent self-approval
      if (approval.requestedBy === userId) {
        alert("You cannot approve your own request");
        return;
      }
      
      setApprovals(approvals.filter(a => a.id !== id));
      setHistory([{ 
        ...approval, 
        status: "approved" as const,
        approvedBy: userId || "unknown",
        approvedAt: new Date().toISOString(),
      }, ...history]);
    }
  };

  const handleRejectClick = (id: string) => {
    if (!hasPermission("canApproveMaterialRequests")) return;
    setRejectingId(id);
    setRejectionReason("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    
    try {
      await materialsApi.reject(rejectingId, rejectionReason.trim());
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectionReason("");
      // Reload approvals
      const data = await materialsApi.getPending(1, 100);
      const requests = data?.requests || [];
      const pending = requests
        .filter((r: any) => r.status === 'pending')
        .map((r: any) => ({
          id: r._id,
          type: 'material' as const,
          title: r.materialName,
          description: `Quantity: ${r.quantity} ${r.unit}`,
          requestedBy: typeof r.requestedBy === 'object' ? r.requestedBy.name : 'Unknown',
          project: typeof r.projectId === 'object' ? r.projectId.name : 'Unknown',
          date: new Date(r.createdAt).toLocaleDateString(),
          quantity: r.quantity,
          unit: r.unit,
          isAnomaly: r.anomalyDetected,
          anomalyReason: r.anomalyReason,
          status: r.status,
        }));
      setApprovals(pending);
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error?.message || 'Failed to reject request');
    }
  };

  // Permission check
  if (!hasPermission("canApproveMaterialRequests")) {
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
                You don't have permission to approve requests. Only Project Managers can approve material requests.
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
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">Approvals</h1>
              <p className="text-xs text-muted-foreground">{approvals.length} pending requests</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Pending Approvals */}
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-base text-foreground">Pending</h2>
            
            {approvals.length === 0 ? (
              <Card variant="gradient">
                <CardContent className="p-8 text-center">
                  <Check className="w-12 h-12 text-success mx-auto mb-3" />
                  <p className="font-medium text-foreground">All caught up!</p>
                  <p className="text-sm text-muted-foreground">No pending approvals</p>
                </CardContent>
              </Card>
            ) : (
              approvals.map((approval, index) => (
                <Card 
                  key={approval.id}
                  variant="gradient"
                  className={cn(
                    "opacity-0 animate-fade-up",
                    approval.isAnomaly && "border-warning/30"
                  )}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-4">
                    {/* Anomaly Warning */}
                    {approval.isAnomaly && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 border border-warning/30 mb-3">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span className="text-xs text-warning font-medium">
                          {approval.anomalyReason}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-primary/10">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-medium text-foreground">{approval.title}</h3>
                            <p className="text-xs text-muted-foreground">{approval.description}</p>
                          </div>
                          {approval.quantity && (
                            <div className="text-right shrink-0">
                              <p className="font-display font-bold text-foreground">
                                {approval.quantity}
                              </p>
                              <p className="text-xs text-muted-foreground">{approval.unit}</p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {approval.requestedBy}
                          </div>
                          <span>•</span>
                          <span>{approval.project}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">{approval.date}</p>
                          {approval.delayHours !== undefined && approval.delayHours > 0 && (
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full",
                              approval.delaySeverity === 'critical' && "bg-destructive/20 text-destructive",
                              approval.delaySeverity === 'warning' && "bg-warning/20 text-warning",
                              approval.delaySeverity === 'normal' && "bg-muted text-muted-foreground"
                            )}>
                              {approval.delayDays > 0 ? `${approval.delayDays}d` : `${approval.delayHours}h`} delay
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                        onClick={() => handleRejectClick(approval.id)}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        variant="success"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApprove(approval.id)}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* History */}
          <div className="space-y-3">
            <h2 className="font-display font-semibold text-base text-foreground">History</h2>
            
            {history.map((approval, index) => (
              <Card 
                key={approval.id}
                variant="gradient"
                className="opacity-0 animate-fade-up"
                style={{ animationDelay: `${(index + approvals.length) * 100}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-xl",
                        approval.status === "approved" ? "bg-success/10" : "bg-destructive/10"
                      )}>
                        {approval.status === "approved" ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <X className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{approval.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {approval.quantity} {approval.unit} • {approval.date}
                        </p>
                      </div>
                    </div>
                    <StatusBadge 
                      status={approval.status === "approved" ? "success" : "error"}
                      label={approval.status}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Rejection Reason Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Material Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this material request. If the reason is "material shortage", this will be reflected in insights and analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Rejection Reason *
              </label>
              <Textarea
                placeholder="e.g., Material shortage, Budget constraints, Not needed at this time..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tip: If the reason is "material shortage", it will be tracked in insights and risk analysis.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectionReason("");
                  setRejectingId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                variant="destructive"
              >
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </MobileLayout>
  );
}
