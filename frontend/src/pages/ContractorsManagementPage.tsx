import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KPICard } from "@/components/common/KPICard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { contractorApi, Contractor, ContractorInvoice } from "@/services/api/contractor";
import { projectsApi } from "@/services/api/projects";
import { usersApi } from "@/services/api/users";
import { Users, Plus, Receipt, Loader2, Building, Star, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { Textarea } from "@/components/ui/textarea";

export default function ContractorsManagementPage() {
  const role = useAppSelector((state) => state.auth.role);
  const isOwner = role === "owner";
  const isManager = role === "manager";
  const canAssign = isOwner || isManager;
  const layoutRole = (role ?? "manager") as "engineer" | "manager" | "owner" | "purchase_manager" | "contractor";

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [invoices, setInvoices] = useState<ContractorInvoice[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<ContractorInvoice[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [contractorUserId, setContractorUserId] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [labourCount, setLabourCount] = useState("");
  const [ratePerLabour, setRatePerLabour] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [contractorsData, invoicesData, pendingInvoicesData, projectsData] = await Promise.all([
        contractorApi.getAllContractors(),
        isOwner ? contractorApi.getApprovedInvoices() : Promise.resolve([] as ContractorInvoice[]),
        isManager ? contractorApi.getPendingInvoices() : Promise.resolve([] as ContractorInvoice[]),
        canAssign ? projectsApi.getAll(1, 50) : Promise.resolve(null as any),
      ]);

      console.log('Pending invoices loaded:', pendingInvoicesData);
      
      setContractors(contractorsData || []);
      setInvoices(invoicesData || []);
      setPendingInvoices(pendingInvoicesData || []);
      setProjects(projectsData?.projects || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignContractor = async () => {
    if (!contractorUserId || !selectedProject || !labourCount || !ratePerLabour) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setIsSubmitting(true);

      // Allow owner to type either MongoDB User ID or Offsite ID (e.g., OSCT0002)
      let resolvedContractorUserId = contractorUserId.trim();
      if (/^os/i.test(resolvedContractorUserId)) {
        const user = await usersApi.getByOffsiteId(resolvedContractorUserId);
        resolvedContractorUserId = user._id;
      }

      await contractorApi.assignToProject({
        contractorUserId: resolvedContractorUserId,
        projectId: selectedProject,
        labourCountPerDay: parseInt(labourCount),
        ratePerLabourPerDay: parseFloat(ratePerLabour),
        startDate: new Date().toISOString(),
      });
      toast.success("Contractor assigned successfully!");
      setShowAssignDialog(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign contractor");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setContractorUserId("");
    setSelectedProject("");
    setLabourCount("");
    setRatePerLabour("");
  };

  const handleApproveInvoice = async (invoiceId: string) => {
    try {
      setIsSubmitting(true);
      await contractorApi.approveInvoice(invoiceId);
      toast.success("Invoice approved! It will now be visible to the owner.");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRejectInvoice = async () => {
    if (!selectedInvoice || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    try {
      setIsSubmitting(true);
      await contractorApi.rejectInvoice(selectedInvoice, rejectionReason);
      toast.success("Invoice rejected");
      setShowRejectDialog(false);
      setSelectedInvoice(null);
      setRejectionReason("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const totalLabourCost = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalGST = invoices.reduce((sum, inv) => sum + inv.gstAmount, 0);

  return (
    <MobileLayout role={layoutRole}>
      <div className="p-4 space-y-6 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Contractors</h1>
            <p className="text-sm text-muted-foreground">
              {canAssign ? "Manage contractor assignments" : "View available contractors"}
            </p>
          </div>
          {canAssign && (
            <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Assign
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Contractor to Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Contractor User ID *</Label>
                    <Input
                      value={contractorUserId}
                      onChange={(e) => setContractorUserId(e.target.value)}
                      placeholder="Enter contractor Offsite ID (e.g., OSCT0002) or MongoDB user ID"
                    />
                  </div>
                  <div>
                    <Label>Project *</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project._id} value={project._id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Labour Count / Day *</Label>
                    <Input
                      type="number"
                      value={labourCount}
                      onChange={(e) => setLabourCount(e.target.value)}
                      placeholder="Expected daily labours"
                    />
                  </div>
                  <div>
                    <Label>Rate per Labour / Day (₹) *</Label>
                    <Input
                      type="number"
                      value={ratePerLabour}
                      onChange={(e) => setRatePerLabour(e.target.value)}
                      placeholder="Daily rate in INR"
                    />
                  </div>
                  <Button className="w-full" onClick={handleAssignContractor} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Assign Contractor
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>

        {/* Summary KPIs */}
        {isOwner && (
          <div className="grid grid-cols-2 gap-3">
            <KPICard
              title="Total Labour Cost"
              value={formatCurrency(totalLabourCost)}
              icon={Users}
              variant="default"
              delay={100}
            />
            <KPICard
              title="GST Paid"
              value={formatCurrency(totalGST)}
              icon={Receipt}
              variant="warning"
              delay={200}
            />
          </div>
        )}

        {/* Contractors List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Available Contractors ({contractors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : contractors.length === 0 ? (
              <div className="text-center py-8">
                <Building className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No contractors registered</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contractors.map((contractor, index) => (
                  <motion.div
                    key={contractor._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">
                          {(contractor.userId as any)?.name || 'Unknown'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {(contractor.userId as any)?.email}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          {(contractor.userId as any)?.offsiteId}
                        </p>
                        {/* Rating Display */}
                        <div className="flex items-center gap-1 mt-2">
                          {Array.from({ length: 5 }).map((_, i) => {
                            const rating = contractor.rating || 3; // Default 3 stars
                            return (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < Math.round(rating)
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            );
                          })}
                          <span className="text-xs text-muted-foreground ml-1">
                            ({contractor.rating ? contractor.rating.toFixed(1) : '3.0'})
                          </span>
                        </div>
                      </div>
                      <StatusBadge status="success" label="Active" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>📍 Projects: {contractor.assignedProjects.length}</p>
                      {contractor.contracts.map((contract, i) => (
                        <div key={i} className="mt-2 p-2 rounded bg-muted">
                          <p>Project: {(contract.projectId as any)?.name || 'N/A'}</p>
                          <p>Rate: {formatCurrency(contract.ratePerLabourPerDay)}/labour/day</p>
                          <p>GST: {contract.gstRate}%</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Invoices for Manager Approval */}
        {isManager && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Pending Contractor Invoices ({pendingInvoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : pendingInvoices.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No pending invoices to review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingInvoices.map((invoice, index) => (
                    <motion.div
                      key={invoice._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg border bg-card border-orange-200 dark:border-orange-800"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {invoice.invoiceNumber || `INV-${invoice._id.substring(0, 8)}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {invoice.projectId?.name || 'Unknown Project'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Contractor: {(invoice.contractorId as any)?.userId?.name || 'Unknown'}
                          </p>
                        </div>
                        <StatusBadge status="warning" label="PENDING" />
                      </div>
                      
                      <div className="text-sm space-y-1 mb-3">
                        <p className="text-muted-foreground">
                          📅 Period: {new Date(invoice.weekStartDate).toLocaleDateString()} - {new Date(invoice.weekEndDate).toLocaleDateString()}
                        </p>
                        <p className="text-muted-foreground">
                          👥 Total Labour Days: {invoice.labourCountTotal}
                        </p>
                        <p className="text-muted-foreground">
                          💰 Rate per Labour: {formatCurrency(invoice.ratePerLabour)}
                        </p>
                        <div className="border-t pt-2 mt-2">
                          <p className="text-muted-foreground">
                            Taxable Amount: {formatCurrency(invoice.taxableAmount)}
                          </p>
                          <p className="text-muted-foreground">
                            GST ({invoice.gstRate}%): {formatCurrency(invoice.gstAmount)}
                          </p>
                          <p className="font-semibold text-foreground text-base">
                            Total Amount: {formatCurrency(invoice.totalAmount)}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => handleApproveInvoice(invoice._id)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1"
                          onClick={() => {
                            setSelectedInvoice(invoice._id);
                            setShowRejectDialog(true);
                          }}
                          disabled={isSubmitting}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reject Invoice Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Rejection Reason *</Label>
                <Textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Provide reason for rejecting this invoice..."
                  rows={4}
                  className="mt-2"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setSelectedInvoice(null);
                    setRejectionReason("");
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleRejectInvoice}
                  disabled={isSubmitting || !rejectionReason.trim()}
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Reject Invoice
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Approved Invoices (Owner only) */}
        {isOwner && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Approved Contractor Invoices ({invoices.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No approved invoices yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {invoices.map((invoice, index) => (
                    <motion.div
                      key={invoice._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {invoice.invoiceNumber}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {invoice.projectId?.name || 'N/A'}
                          </p>
                        </div>
                        <StatusBadge status="success" label="APPROVED" />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>👥 Labour Days: {invoice.labourCountTotal}</p>
                        <p>📊 Taxable: {formatCurrency(invoice.taxableAmount)}</p>
                        <p>📊 GST ({invoice.gstRate}%): {formatCurrency(invoice.gstAmount)}</p>
                        <p className="font-semibold text-foreground">
                          Total: {formatCurrency(invoice.totalAmount)}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
