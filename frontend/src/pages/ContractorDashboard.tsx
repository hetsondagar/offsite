import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/common/ActionButton";
import { KPICard } from "@/components/common/KPICard";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { NotificationBell } from "@/components/common/NotificationBell";
import { StatusBadge } from "@/components/common/StatusBadge";
import { contractorApi, ContractorInvoice } from "@/services/api/contractor";
import { Users, MapPin, Receipt, Wrench, Calendar, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function ContractorDashboard() {
  const navigate = useNavigate();
  const [labourCount, setLabourCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [pendingInvoices, setPendingInvoices] = useState<ContractorInvoice[]>([]);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  useEffect(() => {
    loadStats();
    loadPendingInvoices();
  }, []);

  const loadStats = async () => {
    try {
      const [labours, invoices] = await Promise.all([
        contractorApi.getLabours(),
        contractorApi.getMyInvoices(),
      ]);
      setLabourCount(labours?.length || 0);
      setInvoiceCount(invoices?.length || 0);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  };

  const loadPendingInvoices = async () => {
    try {
      setIsLoadingPending(true);
      const invoices = await contractorApi.getMyInvoices();
      const pending = invoices.filter(inv => inv.status === 'PENDING_PM_APPROVAL');
      setPendingInvoices(pending);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load pending invoices');
    } finally {
      setIsLoadingPending(false);
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
    });
  };

  return (
    <MobileLayout role="contractor">
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
              <h2 className="text-xl font-bold text-foreground">Contractor Dashboard</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Manage labours and generate invoices
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            title="Registered Labours"
            value={labourCount}
            icon={Users}
            variant="default"
            delay={200}
            onClick={() => navigate('/contractor/labours')}
          />
          <KPICard
            title="Total Invoices"
            value={invoiceCount}
            icon={Receipt}
            variant="default"
            delay={300}
            onClick={() => navigate('/contractor/weekly-invoice')}
          />
        </div>

        {/* Pending Invoices */}
        {pendingInvoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Pending Invoices ({pendingInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingPending ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvoices.slice(0, 3).map((invoice) => (
                    <motion.div
                      key={invoice._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-sm text-foreground">
                            {invoice.invoiceNumber || 'Invoice'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(invoice.weekStartDate)} - {formatDate(invoice.weekEndDate)}
                          </p>
                        </div>
                        <StatusBadge status="warning" label="PENDING" />
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <p>Project: {(invoice.projectId as any)?.name || 'N/A'}</p>
                        <p>Labour Days: {invoice.labourCountTotal}</p>
                        <p className="font-semibold text-foreground">
                          Total: {formatCurrency(invoice.totalAmount)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                  {pendingInvoices.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate('/contractor/weekly-invoice')}
                    >
                      View All ({pendingInvoices.length})
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Today's Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Mark attendance for your labours and manage weekly invoices.
            </p>
          </CardContent>
        </Card>

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
                icon={Users}
                label="Labours"
                sublabel="Register faces"
                variant="glow"
                onClick={() => navigate("/contractor/labours")}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <ActionButton
                icon={MapPin}
                label="Attendance"
                sublabel="Daily upload"
                variant="outline"
                onClick={() => navigate("/contractor/attendance")}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <ActionButton
                icon={Receipt}
                label="Invoice"
                sublabel="Weekly billing"
                variant="outline"
                onClick={() => navigate("/contractor/weekly-invoice")}
              />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <ActionButton
                icon={Wrench}
                label="Tools"
                sublabel="Issue/Return"
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
