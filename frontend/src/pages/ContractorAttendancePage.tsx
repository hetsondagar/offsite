import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contractorApi, Labour } from "@/services/api/contractor";
import { projectsApi } from "@/services/api/projects";
import { MapPin, Camera, Upload, Users, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { takePhoto } from "@/lib/capacitor-camera";

export default function ContractorAttendancePage() {
  const [labours, setLabours] = useState<Labour[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedLabours, setSelectedLabours] = useState<string[]>([]);
  const [groupPhotoUrl, setGroupPhotoUrl] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadLabours();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll(1, 50);
      setProjects(data?.projects || []);
    } catch (error: any) {
      toast.error("Failed to load projects");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLabours = async () => {
    try {
      setIsLoading(true);
      const data = await contractorApi.getLabours(selectedProject);
      setLabours(data || []);
      setSelectedLabours([]);
    } catch (error: any) {
      toast.error("Failed to load labours");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCaptureGroupPhoto = async () => {
    try {
      const photo = await takePhoto();
      setGroupPhotoUrl(photo);
      toast.success("Group photo captured!");
    } catch (error: any) {
      toast.error("Failed to capture photo");
    }
  };

  const toggleLabour = (labourId: string) => {
    setSelectedLabours(prev =>
      prev.includes(labourId)
        ? prev.filter(id => id !== labourId)
        : [...prev, labourId]
    );
  };

  const selectAll = () => {
    if (selectedLabours.length === labours.length) {
      setSelectedLabours([]);
    } else {
      setSelectedLabours(labours.map(l => l._id));
    }
  };

  const handleSubmitAttendance = async () => {
    if (!selectedProject) {
      toast.error("Please select a project");
      return;
    }
    if (selectedLabours.length === 0) {
      toast.error("Please select at least one labour");
      return;
    }
    if (!groupPhotoUrl) {
      toast.error("Please capture a group photo");
      return;
    }

    try {
      setIsSubmitting(true);
      await contractorApi.uploadAttendance({
        projectId: selectedProject,
        date: new Date().toISOString(),
        groupPhotoUrl,
        presentLabourIds: selectedLabours,
      });
      toast.success(`Attendance marked for ${selectedLabours.length} labours!`);
      setSelectedLabours([]);
      setGroupPhotoUrl(undefined);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit attendance");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MobileLayout role="contractor">
      <div className="p-4 space-y-6 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground">Daily Attendance</h1>
          <p className="text-sm text-muted-foreground">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </motion.div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Project" />
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

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleCaptureGroupPhoto}
            >
              <Camera className="w-4 h-4 mr-2" />
              {groupPhotoUrl ? 'Group Photo Captured ✓' : 'Capture Group Photo'}
            </Button>
          </CardContent>
        </Card>

        {selectedProject && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Mark Present ({selectedLabours.length}/{labours.length})
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {selectedLabours.length === labours.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : labours.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No labours registered for this project</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {labours.map((labour) => (
                    <div
                      key={labour._id}
                      className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-colors ${
                        selectedLabours.includes(labour._id) 
                          ? 'bg-primary/10 border-primary' 
                          : 'bg-card hover:bg-muted'
                      }`}
                      onClick={() => toggleLabour(labour._id)}
                    >
                      <Checkbox
                        checked={selectedLabours.includes(labour._id)}
                        onCheckedChange={() => toggleLabour(labour._id)}
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{labour.name}</p>
                        <p className="text-xs text-muted-foreground">{labour.code}</p>
                      </div>
                      {selectedLabours.includes(labour._id) && (
                        <CheckCircle className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedProject && labours.length > 0 && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmitAttendance}
            disabled={isSubmitting || selectedLabours.length === 0}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Submit Attendance ({selectedLabours.length})
          </Button>
        )}
      </div>
    </MobileLayout>
  );
}
