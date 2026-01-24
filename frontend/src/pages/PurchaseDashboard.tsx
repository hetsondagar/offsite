import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KPICard } from "@/components/common/KPICard";
import { purchaseApi, ApprovedRequest } from "@/services/api/purchase";
import { Send, Package, Clock, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function PurchaseDashboard() {
  const [requests, setRequests] = useState<ApprovedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      const data = await purchaseApi.getApprovedRequests();
      setRequests(data?.requests || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load requests");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMaterial = async (requestId: string) => {
    try {
      setSendingId(requestId);
      await purchaseApi.sendMaterial(requestId);
      toast.success("Material sent successfully!");
      loadRequests();
    } catch (error: any) {
      toast.error(error.message || "Failed to send material");
    } finally {
      setSendingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <MobileLayout role="purchase_manager">
      <div className="p-4 space-y-6 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground">Purchase Dashboard</h1>
          <p className="text-sm text-muted-foreground">Manage approved material requests</p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <KPICard
            title="Pending Send"
            value={requests.length}
            icon={Package}
            variant="warning"
            delay={100}
          />
          <KPICard
            title="Today"
            value={new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            icon={Clock}
            delay={200}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Approved Requests to Send
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
                <p className="text-muted-foreground">All materials have been sent!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request, index) => (
                  <motion.div
                    key={request._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{request.materialName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.quantity} {request.unit}
                        </p>
                      </div>
                      <StatusBadge status="warning" label="Approved" />
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      <p>📍 Project: {request.projectId?.name || 'N/A'}</p>
                      <p>👤 Requested by: {request.requestedBy?.name || 'N/A'}</p>
                      <p>✅ Approved by: {request.approvedBy?.name || 'N/A'}</p>
                      <p>💰 Est. Cost: {formatCurrency(request.quantity * request.approxPriceINR)}</p>
                      <p>📊 GST: {request.gstRate}%</p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleSendMaterial(request._id)}
                      disabled={sendingId === request._id}
                    >
                      {sendingId === request._id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Send Materials
                    </Button>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
