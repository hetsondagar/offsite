import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/common/ActionButton";
import { KPICard } from "@/components/common/KPICard";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { NotificationBell } from "@/components/common/NotificationBell";
import { purchaseApi } from "@/services/api/purchase";
import { Send, History, Package, Wrench, Clock, Receipt, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function PurchaseManagerDashboard() {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [pendingInvoiceCount, setPendingInvoiceCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const [approved, history] = await Promise.all([
        purchaseApi.getApprovedRequests(1, 100).catch((e) => {
          console.error('Failed to load approved requests:', e);
          return { requests: [], pagination: {} };
        }),
        purchaseApi.getAllHistory(1, 100).catch((e) => {
          console.error('Failed to load history:', e);
          return { history: [], pagination: {} };
        }),
      ]);
      
      setPendingCount(approved?.requests?.length || 0);
      setSentCount(history?.history?.filter((h: any) => h.status === 'SENT' || h.status === 'PENDING_GRN').length || 0);
      
      // Load pending invoices count
      try {
        const { purchaseInvoiceApi } = await import('@/services/api/purchase');
        const invoiceData = await purchaseInvoiceApi.getInvoices(1, 100).catch(() => ({ invoices: [], pagination: {} }));
        const pendingInvoices = (invoiceData?.invoices || []).filter((inv: any) => !inv.receiptPhotoUrl);
        setPendingInvoiceCount(pendingInvoices.length);
      } catch (e) {
        console.error('Failed to load invoices:', e);
        // Don't fail the whole page if invoices fail to load
      }
    } catch (e: any) {
      console.error('Failed to load stats:', e);
      toast.error('Failed to load dashboard data. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout role="purchase_manager">
      <div className="p-4 space-y-6 safe-area-top">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <Logo size="xl" showText={false} />
          <div className="flex items-center justify-between w-full px-2">
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{currentTime}</p>
              <p className="text-xs text-muted-foreground">{currentDate}</p>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle variant="icon" />
            </div>
          </div>
        </motion.div>

        {/* Welcome Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold text-foreground">Purchase Manager</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage material dispatch and tracking
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI Cards */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <KPICard
              title="Pending Send"
              value={pendingCount}
              icon={Package}
              variant={pendingCount > 0 ? "warning" : "success"}
              delay={200}
              onClick={() => navigate('/purchase-dashboard')}
            />
            <KPICard
              title="In Transit"
              value={sentCount}
              icon={Clock}
              variant="default"
              delay={300}
              onClick={() => navigate('/purchase-history')}
            />
            {pendingInvoiceCount > 0 && (
              <KPICard
                title="Pending Receipts"
                value={pendingInvoiceCount}
                icon={Receipt}
                variant="warning"
                delay={400}
                onClick={() => navigate('/purchase-invoices')}
                className="col-span-2"
              />
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-lg text-foreground px-2">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <ActionButton
                icon={Send}
                label="Send Materials"
                sublabel="Approved requests"
                variant="glow"
                onClick={() => navigate("/purchase-dashboard")}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ActionButton
                icon={History}
                label="History"
                sublabel="All transactions"
                variant="outline"
                onClick={() => navigate("/purchase-history")}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ActionButton
                icon={Receipt}
                label="Invoices"
                sublabel="Upload receipts"
                variant={pendingInvoiceCount > 0 ? "glow" : "outline"}
                onClick={() => navigate("/purchase-invoices")}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <ActionButton
                icon={Wrench}
                label="Tool Library"
                sublabel="Manage tools"
                variant="outline"
                onClick={() => navigate("/tools")}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </MobileLayout>
  );
}
