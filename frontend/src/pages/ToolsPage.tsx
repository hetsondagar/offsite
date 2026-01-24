import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toolsApi, Tool } from "@/services/api/tools";
import { projectsApi } from "@/services/api/projects";
import { Wrench, Plus, ArrowRightLeft, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useAppSelector } from "@/store/hooks";

export default function ToolsPage() {
  const { role } = useAppSelector((state) => state.auth);
  const [tools, setTools] = useState<Tool[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [issueDialog, setIssueDialog] = useState<{ open: boolean; toolId: string }>({ open: false, toolId: '' });
  
  // Form state
  const [newToolName, setNewToolName] = useState("");
  const [newToolCategory, setNewToolCategory] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedWorkerName, setSelectedWorkerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [toolsData, projectsData] = await Promise.all([
        toolsApi.getAllTools(),
        projectsApi.getAll(1, 50),
      ]);
      setTools(toolsData?.tools || []);
      setProjects(projectsData?.projects || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTool = async () => {
    if (!newToolName) {
      toast.error("Please enter tool name");
      return;
    }

    try {
      setIsSubmitting(true);
      await toolsApi.createTool({
        name: newToolName,
        category: newToolCategory || undefined,
      });
      toast.success("Tool created successfully!");
      setShowAddDialog(false);
      setNewToolName("");
      setNewToolCategory("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to create tool");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIssueTool = async () => {
    if (!selectedProject || !selectedWorkerName) {
      toast.error("Please fill all fields");
      return;
    }

    try {
      setIsSubmitting(true);
      await toolsApi.issueTool(issueDialog.toolId, {
        projectId: selectedProject,
        labourName: selectedWorkerName,
      });
      toast.success("Tool issued successfully!");
      setIssueDialog({ open: false, toolId: '' });
      setSelectedProject("");
      setSelectedWorkerName("");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to issue tool");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReturnTool = async (toolId: string) => {
    try {
      await toolsApi.returnTool(toolId);
      toast.success("Tool returned successfully!");
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to return tool");
    }
  };

  const getMobileRole = () => {
    if (role === 'purchase_manager') return 'purchase_manager';
    if (role === 'contractor') return 'contractor';
    if (role === 'manager') return 'manager';
    if (role === 'owner') return 'owner';
    return 'engineer';
  };

  return (
    <MobileLayout role={getMobileRole() as any}>
      <div className="p-4 space-y-6 safe-area-top pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-between items-center"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Tool Library</h1>
            <p className="text-sm text-muted-foreground">Issue and return tools</p>
          </div>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              All Tools ({tools.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : tools.length === 0 ? (
              <div className="text-center py-8">
                <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No tools in library</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tools.map((tool, index) => (
                  <motion.div
                    key={tool._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-foreground">{tool.name}</h3>
                        <p className="text-sm text-muted-foreground">ID: {tool.toolId}</p>
                        {tool.category && (
                          <p className="text-xs text-muted-foreground">{tool.category}</p>
                        )}
                      </div>
                      <StatusBadge 
                        status={tool.status === 'AVAILABLE' ? 'success' : 'warning'} 
                        label={tool.status} 
                      />
                    </div>

                    {tool.status === 'ISSUED' && (
                      <div className="text-sm text-muted-foreground mb-3">
                        <p>👤 Holder: {tool.currentHolderName || tool.currentLabourName || 'N/A'}</p>
                        <p>📍 Project: {tool.currentProjectId?.name || 'N/A'}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {tool.status === 'AVAILABLE' ? (
                        <Dialog 
                          open={issueDialog.open && issueDialog.toolId === tool.toolId} 
                          onOpenChange={(open) => setIssueDialog({ open, toolId: open ? tool.toolId : '' })}
                        >
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="flex-1">
                              <ArrowRightLeft className="w-4 h-4 mr-2" />
                              Issue
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Issue Tool: {tool.name}</DialogTitle>
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
                                <Label>Worker Name *</Label>
                                <Input
                                  value={selectedWorkerName}
                                  onChange={(e) => setSelectedWorkerName(e.target.value)}
                                  placeholder="Enter worker name"
                                />
                              </div>
                              <Button className="w-full" onClick={handleIssueTool} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Issue Tool
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => handleReturnTool(tool.toolId)}
                        >
                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                          Return
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        <History className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating Action Button */}
      {(role === 'manager' || role === 'owner') && (
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="fixed bottom-6 right-6 p-4 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow z-40 safe-area-inset-bottom"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Tool</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tool Name *</Label>
                <Input
                  value={newToolName}
                  onChange={(e) => setNewToolName(e.target.value)}
                  placeholder="e.g., Power Drill"
                />
              </div>
              <div>
                <Label>Category</Label>
                <Input
                  value={newToolCategory}
                  onChange={(e) => setNewToolCategory(e.target.value)}
                  placeholder="e.g., Power Tools"
                />
              </div>
              <Button className="w-full" onClick={handleCreateTool} disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create Tool
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </MobileLayout>
  );
}
