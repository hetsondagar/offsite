import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { contractorApi, ContractorInvoice } from "@/services/api/contractor";
import { projectsApi } from "@/services/api/projects";
import { Receipt, Plus, Calendar, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function ContractorWeeklyInvoicePage() {
  const [invoices, setInvoices] = useState<ContractorInvoice[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [invoicesData, projectsData] = await Promise.all([
        contractorApi.getMyInvoices(),
        projectsApi.getAll(1, 50),
      ]);
      setInvoices(invoicesData || []);
      setProjects(projectsData?.projects || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }

    // Calculate week dates (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    try {
      setIsCreating(true);
      await contractorApi.createInvoice({
        projectId: selectedProject,
        weekStartDate: monday.toISOString(),
        weekEndDate: sunday.toISOString(),
      });
      toast.success("Invoice created successfully!");
      setShowCreateForm(false);
      setSelectedProject("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create invoice");
    } finally {
      setIsCreating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} - ${endDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'warning';
    }
  };

  return (
    <MobileLayout role="contractor">
      <div className="p-4 space-y-6 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Weekly Invoices</h1>
            <p className="text-sm text-muted-foreground">Generate and track invoices</p>
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="w-4 h-4 mr-2" />
            New
          </Button>
        </motion.div>

        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Create Weekly Invoice
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.filter(Boolean).map((project) => (
                      <SelectItem key={project._id} value={project._id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="p-3 rounded-lg bg-muted text-sm">
                  <p className="text-muted-foreground">
                    Invoice will be generated for the current week (Monday - Sunday).
                    Labour attendance will be automatically counted.
                  </p>
                </div>

                <Button className="w-full" onClick={handleCreateInvoice} disabled={isCreating}>
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Invoice
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              My Invoices ({invoices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No invoices created yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.map((invoice, index) => (
                  <motion.div
                    key={invoice._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {invoice.invoiceNumber || `Invoice #${index + 1}`}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDateRange(invoice.weekStartDate, invoice.weekEndDate)}
                        </p>
                      </div>
                      <StatusBadge 
                        status={getStatusType(invoice.status) as any} 
                        label={invoice.status.replace(/_/g, ' ')} 
                      />
                    </div>

                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>📍 Project: {invoice.projectId?.name || 'N/A'}</p>
                      <p>👥 Labour Days: {invoice.labourCountTotal}</p>
                      <p>💰 Rate: {formatCurrency(invoice.ratePerLabour)}/day</p>
                      <p>📊 GST ({invoice.gstRate}%): {formatCurrency(invoice.gstAmount)}</p>
                      <p className="font-semibold text-foreground text-base">
                        Total: {formatCurrency(invoice.totalAmount)}
                      </p>
                    </div>

                    {invoice.rejectionReason && (
                      <div className="mt-3 p-2 rounded bg-destructive/10 text-destructive text-sm">
                        Rejected: {invoice.rejectionReason}
                      </div>
                    )}
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
