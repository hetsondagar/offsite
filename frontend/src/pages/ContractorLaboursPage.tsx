import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contractorApi, Labour } from "@/services/api/contractor";
import { projectsApi } from "@/services/api/projects";
import { Users, Plus, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { takePhoto } from "@/lib/capacitor-camera";

export default function ContractorLaboursPage() {
  const [labours, setLabours] = useState<Labour[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form state
  const [name, setName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [faceImageUrl, setFaceImageUrl] = useState<string | undefined>();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [laboursData, projectsData] = await Promise.all([
        contractorApi.getLabours(),
        projectsApi.getAll(1, 50),
      ]);
      setLabours(laboursData || []);
      setProjects(projectsData?.projects || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCapturePhoto = async () => {
    try {
      const photo = await takePhoto();
      setFaceImageUrl(photo);
      toast.success("Photo captured!");
    } catch (error: any) {
      toast.error("Failed to capture photo");
    }
  };

  const handleAddLabour = async () => {
    if (!name || !selectedProject) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setIsAdding(true);
      await contractorApi.registerLabour({
        name,
        faceImageUrl,
        projectId: selectedProject,
      });
      toast.success("Labour registered successfully!");
      setShowAddForm(false);
      setName("");
      setSelectedProject("");
      setFaceImageUrl(undefined);
      loadData();
    } catch (error: any) {
      toast.error(error.message || "Failed to register labour");
    } finally {
      setIsAdding(false);
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
            <h1 className="text-2xl font-bold text-foreground">Labour Management</h1>
            <p className="text-sm text-muted-foreground">Register and manage labours</p>
          </div>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        </motion.div>

        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Register New Labour</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter labour name"
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
                  <Label>Face Photo (Optional)</Label>
                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" onClick={handleCapturePhoto} className="flex-1">
                      <Camera className="w-4 h-4 mr-2" />
                      {faceImageUrl ? 'Photo Captured ✓' : 'Capture Face'}
                    </Button>
                  </div>
                </div>

                <Button className="w-full" onClick={handleAddLabour} disabled={isAdding}>
                  {isAdding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Register Labour
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Registered Labours ({labours.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : labours.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No labours registered yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {labours.map((labour, index) => (
                  <motion.div
                    key={labour._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border bg-card flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      {labour.faceImageUrl ? (
                        <img 
                          src={labour.faceImageUrl} 
                          alt={labour.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{labour.name}</h3>
                      <p className="text-sm text-muted-foreground">Code: {labour.code}</p>
                      <p className="text-xs text-muted-foreground">
                        Project: {labour.projectId?.name || 'N/A'}
                      </p>
                    </div>
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
