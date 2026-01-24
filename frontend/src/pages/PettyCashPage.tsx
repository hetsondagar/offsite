import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { KPICard } from "@/components/common/KPICard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { pettyCashApi, PettyCash } from "@/services/api/petty-cash";
import { projectsApi } from "@/services/api/projects";
import { Wallet, Plus, Camera, MapPin, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";
import { takePhoto } from "@/lib/capacitor-camera";
import { getCurrentPosition, reverseGeocode } from "@/lib/capacitor-geolocation";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";

const EXPENSE_CATEGORIES = [
  "Transportation",
  "Food & Refreshments",
  "Tools & Supplies",
  "Safety Equipment",
  "Office Supplies",
  "Miscellaneous",
];

export default function PettyCashPage() {
  const { role } = useAppSelector((state) => state.auth);
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();

  const canSubmit = hasPermission("canSubmitPettyCash");
  const canApprove = hasPermission("canApprovePettyCash");
  const canViewDashboard = hasPermission("canViewPettyCashDashboard");

  const [expenses, setExpenses] = useState<PettyCash[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PettyCash[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [summary, setSummary] = useState<{ totalApproved: number; count: number } | null>(null);

  // Form state
  const [selectedProject, setSelectedProject] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [receiptPhotoUrl, setReceiptPhotoUrl] = useState<string | undefined>();
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address: string } | null>(null);

  useEffect(() => {
    if (role === 'manager') {
      toast.error("Project Managers approve reimbursements from Pending Approvals");
      navigate("/", { replace: true });
      return;
    }

    if (!canSubmit && !canApprove && !canViewDashboard) {
      toast.error("You don't have permission to access reimbursements");
      navigate("/", { replace: true });
      return;
    }
    loadData();
  }, [role, canSubmit, canApprove, canViewDashboard]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const projectsData = await projectsApi.getAll(1, 50);
      setProjects(projectsData?.projects || []);

      if (canViewDashboard) {
        const data = await pettyCashApi.getAllExpenses();
        setExpenses(data?.expenses || []);
        setSummary(data?.summary || null);
      } else if (canSubmit) {
        const myExpenses = await pettyCashApi.getMyExpenses();
        setExpenses(myExpenses || []);
      } else {
        setExpenses([]);
      }

      if (canApprove) {
        const pending = await pettyCashApi.getPendingExpenses();
        setPendingExpenses(pending || []);
      } else {
        setPendingExpenses([]);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptureReceipt = async () => {
    try {
      const photo = await takePhoto();
      setReceiptPhotoUrl(photo);
      toast.success("Receipt photo captured!");
    } catch (error: any) {
      toast.error("Failed to capture photo");
    }
  };

  const handleCaptureLocation = async () => {
    try {
      const position = await getCurrentPosition();
      const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        address,
      });
      toast.success("Location captured!");
    } catch (error: any) {
      toast.error("Failed to get location");
    }
  };

  const handleSubmitExpense = async () => {
    if (!selectedProject || !amount || !description || !category) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await pettyCashApi.submitExpense({
        projectId: selectedProject,
        amount: parseFloat(amount),
        description,
        category,
        receiptPhotoUrl,
        geoLocation: location?.address,
        latitude: location?.latitude,
        longitude: location?.longitude,
      });
      toast.success("Expense submitted successfully!");
      setShowCreateDialog(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to submit expense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedProject("");
    setAmount("");
    setDescription("");
    setCategory("");
    setReceiptPhotoUrl(undefined);
    setLocation(null);
  };

  const handleApproveExpense = async (id: string) => {
    try {
      await pettyCashApi.approveExpense(id);
      toast.success("Expense approved!");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve expense");
    }
  };

  const handleRejectExpense = async (id: string) => {
    try {
      await pettyCashApi.rejectExpense(id, "Rejected by approver");
      toast.success("Expense rejected");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to reject expense");
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'REJECTED': return 'error';
      default: return 'warning';
    }
  };

  return (
    <MobileLayout role={role as any || 'engineer'}>
      <div className="p-4 space-y-6 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">{role === 'engineer' ? 'Reimbursements' : 'Petty Cash'}</h1>
            <p className="text-sm text-muted-foreground">Submit and track site expenses</p>
          </div>
          {canSubmit && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Submit Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
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
                    <Label>Amount (₹) *</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <Label>Category *</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe the expense..."
                      rows={2}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={handleCaptureReceipt}>
                      <Camera className="w-4 h-4 mr-2" />
                      {receiptPhotoUrl ? 'Receipt ✓' : 'Receipt'}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={handleCaptureLocation}>
                      <MapPin className="w-4 h-4 mr-2" />
                      {location ? 'Location ✓' : 'Location'}
                    </Button>
                  </div>
                  {location && (
                    <p className="text-xs text-muted-foreground">📍 {location.address}</p>
                  )}
                  <Button className="w-full" onClick={handleSubmitExpense} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Expense
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>

        {/* Summary for Owner */}
        {canViewDashboard && summary && (
          <div className="grid grid-cols-2 gap-3">
            <KPICard
              title="Total Approved"
              value={formatCurrency(summary.totalApproved)}
              icon={Wallet}
              variant="success"
              delay={100}
            />
            <KPICard
              title="Pending"
              value={pendingExpenses.length}
              icon={AlertTriangle}
              variant="warning"
              delay={200}
            />
          </div>
        )}

        {/* Pending Approvals */}
        {canApprove && pendingExpenses.length > 0 && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5" />
                Pending Approvals ({pendingExpenses.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingExpenses.map((expense) => (
                <div key={expense._id} className="p-4 rounded-lg border bg-card">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{formatCurrency(expense.amount)}</h3>
                      <p className="text-sm text-muted-foreground">{expense.category}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge 
                        status={getStatusType(expense.status) as any} 
                        label={expense.status.replace(/_/g, ' ')} 
                      />
                      {!expense.geoFenceValid && (
                        <span className="text-xs text-warning">⚠️ Outside site</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{expense.description}</p>

                  {expense.geoLocation && (
                    <p className="text-xs text-muted-foreground mb-2">📍 {expense.geoLocation}</p>
                  )}

                  {expense.receiptPhotoUrl && (
                    <div className="mb-3">
                      <a
                        href={expense.receiptPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        View receipt photo
                      </a>
                      <div className="mt-2">
                        <img
                          src={expense.receiptPhotoUrl}
                          alt="Receipt"
                          className="w-full max-w-sm rounded-md border object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="flex-1"
                      onClick={() => handleApproveExpense(expense._id)}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleRejectExpense(expense._id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              {canViewDashboard ? 'All Expenses' : 'My Expenses'} ({expenses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : expenses.length === 0 ? (
              <div className="text-center py-8">
                <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No expenses recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map((expense, index) => (
                  <motion.div
                    key={expense._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{formatCurrency(expense.amount)}</h3>
                        <p className="text-sm text-muted-foreground">{expense.category}</p>
                      </div>
                      <StatusBadge 
                        status={getStatusType(expense.status) as any} 
                        label={expense.status.replace(/_/g, ' ')} 
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">{expense.description}</p>
                    {expense.geoLocation && (
                      <p className="text-xs text-muted-foreground mt-1">📍 {expense.geoLocation}</p>
                    )}
                    {expense.receiptPhotoUrl && (
                      <div className="mt-2">
                        <a
                          href={expense.receiptPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary underline"
                        >
                          View receipt photo
                        </a>
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
