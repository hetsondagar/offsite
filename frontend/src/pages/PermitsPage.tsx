import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { permitsApi, Permit } from "@/services/api/permits";
import { projectsApi } from "@/services/api/projects";
import { ShieldCheck, Plus, Key, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";

const HAZARD_TYPES = [
  "Working at Height",
  "Hot Work (Welding/Cutting)",
  "Confined Space Entry",
  "Electrical Work",
  "Excavation",
  "Lifting Operations",
  "Chemical Handling",
  "Other",
];

export default function PermitsPage() {
  const { role } = useAppSelector((state) => state.auth);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [pendingPermits, setPendingPermits] = useState<Permit[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [otpDialog, setOtpDialog] = useState<{ open: boolean; permitId: string }>({ open: false, permitId: '' });
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [selectedProject, setSelectedProject] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [hazardType, setHazardType] = useState("");
  const [safetyMeasures, setSafetyMeasures] = useState("");

  useEffect(() => {
    loadData();
  }, [role]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const projectsData = await projectsApi.getAll(1, 50);
      setProjects(projectsData?.projects || []);

      if (role === 'engineer') {
        const myPermits = await permitsApi.getMyPermits();
        setPermits(myPermits || []);
      } else if (role === 'manager') {
        const [myPermits, pending] = await Promise.all([
          permitsApi.getMyPermits(),
          permitsApi.getPendingPermits(),
        ]);
        setPermits(myPermits || []);
        setPendingPermits(pending || []);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePermit = async () => {
    if (!selectedProject || !taskDescription || !hazardType) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await permitsApi.createPermit({
        projectId: selectedProject,
        taskDescription,
        hazardType,
        safetyMeasures: safetyMeasures.split('\n').filter(s => s.trim()),
      });
      toast.success("Permit request submitted!");
      setShowCreateDialog(false);
      setSelectedProject("");
      setTaskDescription("");
      setHazardType("");
      setSafetyMeasures("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create permit");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprovePermit = async (permitId: string) => {
    try {
      await permitsApi.approvePermit(permitId);
      toast.success("Permit approved! OTP sent to engineer.");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve permit");
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setIsSubmitting(true);
      await permitsApi.verifyOTP(otpDialog.permitId, otp);
      toast.success("OTP verified! You may begin work.");
      setOtpDialog({ open: false, permitId: '' });
      setOtp("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Invalid OTP");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusType = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'EXPIRED': return 'error';
      case 'OTP_GENERATED': return 'info';
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
            <h1 className="text-2xl font-bold text-foreground">Permit to Work</h1>
            <p className="text-sm text-muted-foreground">Safety clearance for hazardous tasks</p>
          </div>
          {role === 'engineer' && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Request
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Request Permit to Work</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Project *</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.filter(Boolean).map((project) => (
                          <SelectItem key={project._id} value={project._id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Hazard Type *</Label>
                    <Select value={hazardType} onValueChange={setHazardType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select hazard type" />
                      </SelectTrigger>
                      <SelectContent>
                        {HAZARD_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Task Description *</Label>
                    <Textarea
                      value={taskDescription}
                      onChange={(e) => setTaskDescription(e.target.value)}
                      placeholder="Describe the hazardous task..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Safety Measures (one per line)</Label>
                    <Textarea
                      value={safetyMeasures}
                      onChange={(e) => setSafetyMeasures(e.target.value)}
                      placeholder="Safety harness&#10;Fire extinguisher&#10;First aid kit"
                      rows={3}
                    />
                  </div>
                  <Button className="w-full" onClick={handleCreatePermit} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Request
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </motion.div>

        {/* Pending Approvals for Managers */}
        {role === 'manager' && pendingPermits.length > 0 && (
          <Card className="border-warning">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <AlertTriangle className="w-5 h-5" />
                Pending Approvals ({pendingPermits.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingPermits.map((permit) => (
                <div key={permit._id} className="p-4 rounded-lg border bg-card">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{permit.hazardType}</h3>
                      <p className="text-sm text-muted-foreground">
                        By: {permit.requestedBy?.name || 'N/A'}
                      </p>
                    </div>
                    <StatusBadge status="warning" label="PENDING" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{permit.taskDescription}</p>
                  <Button 
                    className="w-full" 
                    onClick={() => handleApprovePermit(permit._id)}
                  >
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Approve & Generate OTP
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              My Permits ({permits.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : permits.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No permits requested</p>
              </div>
            ) : (
              <div className="space-y-4">
                {permits.map((permit, index) => (
                  <motion.div
                    key={permit._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{permit.hazardType}</h3>
                        <p className="text-sm text-muted-foreground">
                          {permit.projectId?.name || 'N/A'}
                        </p>
                      </div>
                      <StatusBadge 
                        status={getStatusType(permit.status) as any} 
                        label={permit.status.replace(/_/g, ' ')} 
                      />
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{permit.taskDescription}</p>

                    {permit.status === 'OTP_GENERATED' && role === 'engineer' && (
                      <Dialog
                        open={otpDialog.open && otpDialog.permitId === permit._id}
                        onOpenChange={(open) => setOtpDialog({ open, permitId: open ? permit._id : '' })}
                      >
                        <DialogTrigger asChild>
                          <Button className="w-full">
                            <Key className="w-4 h-4 mr-2" />
                            Enter OTP to Start Work
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Enter OTP</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Enter the 6-digit OTP sent to you. Valid for 10 minutes.
                            </p>
                            <Input
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              placeholder="Enter 6-digit OTP"
                              maxLength={6}
                              className="text-center text-2xl tracking-widest"
                            />
                            <Button className="w-full" onClick={handleVerifyOTP} disabled={isSubmitting}>
                              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                              Verify & Start Work
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}

                    {permit.status === 'COMPLETED' && (
                      <div className="flex items-center gap-2 text-success">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Work started at {new Date(permit.workStartedAt!).toLocaleTimeString()}</span>
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
