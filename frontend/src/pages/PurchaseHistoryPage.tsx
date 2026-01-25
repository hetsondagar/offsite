import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { purchaseApi, PurchaseHistory } from "@/services/api/purchase";
import { History, Package, CheckCircle, Clock, Loader2, Camera, MapPin } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { ConfirmReceiptModal } from "@/components/purchase/ConfirmReceiptModal";

const formatLatLng = (coords?: { latitude: number; longitude: number }) => {
  if (!coords) return undefined;
  return `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
};

const getManagerLabel = (item: PurchaseHistory) => {
  if (item.status === 'RECEIVED') return 'APPROVAL PENDING';
  return 'WAITING FOR RECEIPT';
};

const getManagerBadgeStatus = (item: PurchaseHistory) => {
  if (item.status === 'RECEIVED') return 'warning' as const;
  return 'info' as const;
};

export default function PurchaseHistoryPage() {
  const { role } = useAppSelector((state) => state.auth);
  const [history, setHistory] = useState<PurchaseHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<PurchaseHistory | null>(null);

  useEffect(() => {
    loadHistory();
  }, [role]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      if (role === 'engineer') {
        const data = await purchaseApi.getSentForEngineer();
        setHistory(data?.history || []);
      } else {
        const data = await purchaseApi.getAllHistory();
        setHistory(data?.history || []);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenConfirmModal = (item: PurchaseHistory) => {
    setSelectedHistory(item);
    setConfirmModalOpen(true);
  };

  const handleConfirmReceipt = async (data: {
    proofPhotoUrl: string;
    geoLocation?: string;
    latitude: number;
    longitude: number;
  }) => {
    if (!selectedHistory) return;

    try {
      setReceivingId(selectedHistory._id);
      await purchaseApi.receiveMaterial(selectedHistory._id, data);
      toast.success("Material received successfully!");
      loadHistory();
      setConfirmModalOpen(false);
      setSelectedHistory(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to confirm receipt");
      throw error;
    } finally {
      setReceivingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <MobileLayout role={role as any || 'engineer'}>
      <div className="p-4 space-y-6 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground">
            {role === 'engineer' ? 'Confirm Material Receipt' : 'Purchase History'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {role === 'engineer' ? 'Confirm materials sent to you' : 'View all purchase transactions'}
          </p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              {role === 'engineer' ? 'Materials to Confirm' : 'All Transactions'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No materials to display</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item, index) => (
                  <motion.div
                    key={item._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.materialName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {item.qty} {item.unit}
                        </p>
                      </div>
                      {role === 'manager' ? (
                        <StatusBadge
                          status={getManagerBadgeStatus(item) as any}
                          label={getManagerLabel(item)}
                        />
                      ) : (
                        <StatusBadge 
                          status={
                            item.status === 'RECEIVED' ? 'success' : 
                            item.status === 'PENDING_GRN' ? 'warning' : 
                            'info'
                          } 
                          label={item.status === 'PENDING_GRN' ? 'PENDING GRN' : item.status} 
                        />
                      )}
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground mb-3">
                      <p>📍 Project: {item.projectId?.name || 'N/A'}</p>
                      <p>📤 Sent: {formatDate(item.sentAt)}</p>
                      <p>👤 By: {item.sentBy?.name || 'N/A'}</p>
                      <p>💰 Total: {formatCurrency(item.totalCost)} (incl. {item.gstRate}% GST)</p>
                      {item.receivedAt && (
                        <p>📥 Received: {formatDate(item.receivedAt)}</p>
                      )}
                      {item.geoLocation && (
                        <p>📍 Location: {item.geoLocation}</p>
                      )}
                      {!item.geoLocation && item.coordinates && (
                        <p>📍 Location: {formatLatLng(item.coordinates)}</p>
                      )}
                    </div>

                    {role !== 'engineer' && item.proofPhotoUrl && (
                      <div className="mb-3">
                        <a
                          href={item.proofPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline"
                        >
                          View receipt/photo proof
                        </a>
                        <div className="mt-2">
                          <img
                            src={item.proofPhotoUrl}
                            alt="Proof"
                            className="w-full max-w-md rounded-md border object-cover"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    )}

                    {role === 'engineer' && (item.status === 'PENDING_GRN' || item.status === 'SENT') && (
                      <Button
                        className="w-full"
                        onClick={() => handleOpenConfirmModal(item)}
                        disabled={receivingId === item._id}
                      >
                        {receivingId === item._id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <>
                            <Camera className="w-4 h-4 mr-2" />
                            <MapPin className="w-4 h-4 mr-2" />
                          </>
                        )}
                        Confirm Receipt
                      </Button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {selectedHistory && (
          <ConfirmReceiptModal
            open={confirmModalOpen}
            onClose={() => {
              setConfirmModalOpen(false);
              setSelectedHistory(null);
            }}
            purchaseHistory={selectedHistory}
            onConfirm={handleConfirmReceipt}
          />
        )}
      </div>
    </MobileLayout>
  );
}
