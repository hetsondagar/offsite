import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/common/ActionButton";
import { KPICard } from "@/components/common/KPICard";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { NotificationBell } from "@/components/common/NotificationBell";
import { contractorApi } from "@/services/api/contractor";
import { Users, MapPin, Receipt, Wrench, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function ContractorDashboard() {
  const navigate = useNavigate();
  const [labourCount, setLabourCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  useEffect(() => {
    loadStats();
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
