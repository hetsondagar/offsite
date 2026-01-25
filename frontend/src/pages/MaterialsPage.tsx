import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Package, 
  Plus, 
  Minus,
  AlertTriangle,
  Check,
  Loader2,
  ChevronDown,
  Send,
  AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { saveMaterialRequest } from "@/lib/indexeddb";
import { isOnline as checkOnline } from "@/lib/network";
import { useAppSelector } from "@/store/hooks";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import { materialsApi } from "@/services/api/materials";
import { projectsApi } from "@/services/api/projects";
import { usersApi } from "@/services/api/users";
import { PageHeader } from "@/components/common/PageHeader";
import { Label } from "@/components/ui/label";

export default function MaterialsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const userId = useAppSelector((state) => state.auth.userId);
  const role = useAppSelector((state) => state.auth.role);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const materialDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
      if (materialDropdownRef.current && !materialDropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showProjectDropdown || showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProjectDropdown, showDropdown]);

  // Check permission
  useEffect(() => {
    if (!hasPermission("canRaiseMaterialRequest")) {
      navigate("/");
    }
  }, [hasPermission, navigate]);

  // Load materials and projects
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        
        // Load materials catalog from API
        try {
          const catalog = await materialsApi.getCatalog();
          
          // Ensure catalog is an array
          if (Array.isArray(catalog)) {
            const mappedMaterials = catalog.map((mat: any) => ({
              id: mat._id || mat.id,
              name: mat.name,
              unit: mat.unit,
              anomalyThreshold: mat.defaultAnomalyThreshold || 1.3,
            }));
            setMaterials(mappedMaterials);
          } else {
            console.warn('Materials catalog is not an array:', catalog);
            setMaterials([]);
          }
        } catch (catalogError) {
          console.error('Error loading materials catalog:', catalogError);
          setMaterials([]);
        }
        
        // Load projects based on user role
        try {
          if (role === 'owner') {
            // Owners see all projects
            const projectsData = await projectsApi.getAll(1, 100);
            setProjects(projectsData?.projects || []);
          } else {
            // Engineers and managers see only assigned projects
            const user = await usersApi.getMe();
            if (user.assignedProjects && user.assignedProjects.length > 0) {
              // Extract project IDs (handle both populated objects and string IDs)
              const projectIds = user.assignedProjects.map((project: any) => {
                if (typeof project === 'string') {
                  return project;
                }
                if (project && typeof project === 'object') {
                  return project._id || project;
                }
                return null;
              }).filter((id: any) => id !== null);

              // Fetch full project details for each ID
              if (projectIds.length > 0) {
                const projectPromises = projectIds.map((projectId: string) => 
                  projectsApi.getById(projectId).catch(() => null)
                );
                const projectsData = await Promise.all(projectPromises);
                setProjects(projectsData.filter(p => p !== null && p.project).map(p => p!.project));
              } else {
                setProjects([]);
              }
            } else {
              setProjects([]);
            }
          }
        } catch (projectError) {
          console.error('Error loading projects:', projectError);
          setProjects([]);
        }
        
        // Try to load pending requests
        try {
          const requestsData = await materialsApi.getPending(1, 100);
          const requests = requestsData?.requests || [];
          // Filter for current user's requests
          const userRequests = requests
            .filter((r: any) => {
              const requestedBy = typeof r.requestedBy === 'object' ? r.requestedBy._id : r.requestedBy;
              return requestedBy === userId;
            })
            .map((r: any) => ({
              id: r._id,
              material: r.materialName,
              quantity: `${r.quantity} ${r.unit}`,
              date: new Date(r.createdAt).toLocaleDateString(),
              status: r.status,
            }));
          setPendingRequests(userRequests);
        } catch (requestError) {
          console.error('Error loading pending requests:', requestError);
          setPendingRequests([]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [userId]);

  const selectedMaterialData = materials.find(m => m.id === selectedMaterial);
  const isAnomaly = selectedMaterialData && quantity > selectedMaterialData.anomalyThreshold;

  const handleSubmit = async () => {
    if (!selectedMaterial || !selectedMaterialData) return;
    if (!selectedProject) {
      toast.error("Please select a project for this material request.");
      return;
    }
    setIsSubmitting(true);
    const resetForm = () => {
      setTimeout(() => {
        setShowSuccess(false);
        setSelectedMaterial(null);
        setSelectedProject(null);
        setQuantity(0);
        setReason("");
      }, 2000);
    };
    const reloadPending = async () => {
      try {
        const data = await materialsApi.getPending(1, 100);
        const requests = data?.requests || [];
        const userReqs = requests
          .filter((r: any) => (typeof r.requestedBy === 'object' ? r.requestedBy._id : r.requestedBy) === userId)
          .map((r: any) => ({
            id: r._id,
            material: r.materialName,
            quantity: `${r.quantity} ${r.unit}`,
            date: new Date(r.createdAt).toLocaleDateString(),
            status: r.status,
          }));
        setPendingRequests(userReqs);
      } catch (e) {
        console.error('Error reloading requests:', e);
      }
    };
    try {
      const online = await checkOnline();
      if (!online) {
        await saveMaterialRequest({
          projectId: selectedProject,
          materialId: selectedMaterial,
          materialName: selectedMaterialData.name,
          quantity,
          unit: selectedMaterialData.unit,
          reason,
          timestamp: Date.now(),
          requestedBy: userId || "unknown",
          requestedAt: new Date().toISOString(),
        });
        toast.success(t('materials.savedOffline') || 'Saved offline. Will sync automatically.');
        setShowSuccess(true);
        resetForm();
        return;
      }
      await materialsApi.createRequest({
        projectId: selectedProject,
        materialId: selectedMaterial,
        materialName: selectedMaterialData.name,
        quantity,
        unit: selectedMaterialData.unit,
        reason,
      });
      setShowSuccess(true);
      await reloadPending();
      resetForm();
    } catch (err) {
      await saveMaterialRequest({
        projectId: selectedProject,
        materialId: selectedMaterial,
        materialName: selectedMaterialData.name,
        quantity,
        unit: selectedMaterialData.unit,
        reason,
        timestamp: Date.now(),
        requestedBy: userId || "unknown",
        requestedAt: new Date().toISOString(),
      });
      toast.warning(t('materials.savedOfflineWarning') || 'Saved offline. Will sync when connection is restored.');
      setShowSuccess(true);
      await reloadPending();
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Permission check
  if (!hasPermission("canRaiseMaterialRequest")) {
    return (
      <MobileLayout role="engineer">
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <Card className="max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-semibold text-foreground">
                Access Denied
              </h2>
              <p className="text-sm text-muted-foreground">
                You don't have permission to raise material requests. Only Site Engineers can create material requests.
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
    <MobileLayout role="engineer">
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        <PageHeader
          title={t('materials.title')}
          subtitle={t('materials.requestAndTrack')}
          showBack={true}
        />

        {/* Success Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center space-y-4 max-w-sm w-full"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-success/20 flex items-center justify-center"
                >
                  <Check className="w-8 h-8 sm:w-10 sm:h-10 text-success" />
                </motion.div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">{t('materials.requestSubmitted')}</h2>
                <p className="text-sm sm:text-base text-muted-foreground">{t('materials.awaitingManagerApproval')}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* New Request */}
              <Card variant="gradient" className="animate-fade-up">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Package className="w-4 h-4 text-primary" />
                    {t("materials.requestMaterial")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Project Selection */}
                  <div className="space-y-2.5">
                    <Label htmlFor="project-select" className="text-sm font-medium text-foreground">
                      Project <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative" ref={projectDropdownRef}>
                      <button
                        id="project-select"
                        onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                        className="w-full h-12 px-4 rounded-xl bg-background border border-border flex items-center justify-between text-left transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <span className={cn(
                          "text-sm",
                          selectedProject ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {selectedProject 
                            ? projects.find(p => p._id === selectedProject)?.name || "Select Project"
                            : "Select Project"}
                        </span>
                        <ChevronDown className={cn(
                          "w-5 h-5 text-muted-foreground transition-transform",
                          showProjectDropdown && "rotate-180"
                        )} />
                      </button>
                      
                      {showProjectDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-40 animate-scale-in max-h-60 overflow-y-auto">
                          {projects.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                              No projects available
                            </div>
                          ) : (
                            projects.filter(Boolean).map((project) => (
                              <button
                                key={project._id}
                                className="w-full p-4 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                                onClick={() => {
                                  setSelectedProject(project._id);
                                  setShowProjectDropdown(false);
                                }}
                              >
                                <div>
                                  <p className="font-medium">{project.name}</p>
                                  <p className="text-xs text-muted-foreground">{project.location || ''}</p>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Material Dropdown */}
                  <div className="space-y-2.5">
                    <Label htmlFor="material-select" className="text-sm font-medium text-foreground">
                      Material <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative" ref={materialDropdownRef}>
                      <button
                        id="material-select"
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="w-full h-12 px-4 rounded-xl bg-background border border-border flex items-center justify-between text-left transition-colors hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <span className={cn(
                          "text-sm",
                          selectedMaterial ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {selectedMaterialData?.name || "Select Material"}
                        </span>
                        <ChevronDown className={cn(
                          "w-5 h-5 text-muted-foreground transition-transform",
                          showDropdown && "rotate-180"
                        )} />
                      </button>
                      
                      {showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-20 animate-scale-in max-h-60 overflow-y-auto">
                          {materials.length === 0 ? (
                            <div className="p-4 text-sm text-muted-foreground text-center">
                              No materials available
                            </div>
                          ) : (
                            materials.map((material) => (
                              <button
                                key={material.id}
                                className="w-full p-4 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border/30 last:border-0"
                                onClick={() => {
                                  setSelectedMaterial(material.id);
                                  setShowDropdown(false);
                                }}
                              >
                                {material.name}
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quantity Selector */}
                  <div className="space-y-2.5">
                    <Label htmlFor="quantity-input" className="text-sm font-medium text-foreground">
                      Quantity <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(0, quantity - 10))}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <Input
                        id="quantity-input"
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Number(e.target.value))}
                        className="text-center text-2xl font-display font-bold h-14"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 10)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {selectedMaterialData && (
                      <p className="text-xs text-muted-foreground text-center">
                        {selectedMaterialData.unit}
                      </p>
                    )}
                  </div>

                  {/* Anomaly Warning */}
                  <AnimatePresence>
                    {isAnomaly && (
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-start gap-3 p-3 rounded-xl bg-destructive/10 border border-destructive/30"
                      >
                        <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-destructive">Unusual Quantity</p>
                          <p className="text-xs text-muted-foreground">
                            This exceeds typical usage. Please provide a reason.
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Reason */}
                  <div className="space-y-2.5">
                    <Label htmlFor="reason-input" className="text-sm font-medium text-foreground">
                      Reason {isAnomaly && <span className="text-destructive">*</span>}
                    </Label>
                    <Input
                      id="reason-input"
                      placeholder="Enter reason for request..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={!selectedMaterial || !selectedProject || quantity === 0 || (isAnomaly && !reason) || isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Pending Requests */}
              <Card variant="gradient" className="animate-fade-up stagger-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("materials.yourRequests")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pendingRequests.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">{t('materials.noPendingRequests')}</p>
                    ) : (
                      pendingRequests.map((request) => (
                        <div key={request.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                          <div>
                            <p className="font-medium text-sm text-foreground">{request.material}</p>
                            <p className="text-xs text-muted-foreground">
                              {request.quantity} · {request.date}
                            </p>
                          </div>
                          <StatusBadge 
                            status={request.status === "approved" ? "success" : request.status === "rejected" ? "error" : "pending"}
                            label={request.status}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
