import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { contractorApi, Labour } from "@/services/api/contractor";
import { projectsApi } from "@/services/api/projects";
import { MapPin, Camera, Upload, Users, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { takePhoto } from "@/lib/capacitor-camera";
import { getCurrentPosition, reverseGeocode } from "@/lib/capacitor-geolocation";
import { detectAllFaces, matchFaces, createImageElement } from "@/lib/face-recognition";

export default function ContractorAttendancePage() {
  const [labours, setLabours] = useState<Labour[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedLabours, setSelectedLabours] = useState<string[]>([]);
  const [groupPhotoUrl, setGroupPhotoUrl] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingFace, setIsProcessingFace] = useState(false);
  const [detectedFaces, setDetectedFaces] = useState<string[]>([]);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

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
      // Capture photo
      const photo = await takePhoto({ source: 'camera' });
      setGroupPhotoUrl(photo);
      
      // Capture geolocation
      setIsCapturingLocation(true);
      try {
        const position = await getCurrentPosition({ enableHighAccuracy: true });
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(loc);
        
        // Reverse geocode to get location name
        try {
          const address = await reverseGeocode(loc.latitude, loc.longitude);
          setLocationName(address);
          toast.success("Photo and location captured!");
        } catch (geoError) {
          console.warn("Reverse geocoding failed:", geoError);
          setLocationName(`${loc.latitude.toFixed(6)}, ${loc.longitude.toFixed(6)}`);
          toast.success("Photo and location captured!");
        }
      } catch (locError: any) {
        console.error("Location capture failed:", locError);
        toast.error("Photo captured but location failed. Please enable location permissions.");
      } finally {
        setIsCapturingLocation(false);
      }

      // Process face recognition if labours are loaded (wait a bit for photo to be ready)
      if (labours.length > 0) {
        setTimeout(() => {
          processFaceRecognition(photo).catch(err => {
            console.error("Face recognition error:", err);
          });
        }, 200);
      }
    } catch (error: any) {
      console.error("Failed to capture photo:", error);
      toast.error(error.message || "Failed to capture photo");
    }
  };

  const processFaceRecognition = async (photoUrl: string) => {
    try {
      setIsProcessingFace(true);
      toast.info("Processing faces in photo...");
      
      // Get labours with face embeddings
      const laboursWithFaces = labours.filter(l => l.faceEmbedding && l.faceEmbedding.length > 0);
      
      if (laboursWithFaces.length === 0) {
        toast.warning("No labours have registered faces. Please register faces first.");
        setDetectedFaces([]);
        return;
      }

      console.log(`Processing face recognition for ${laboursWithFaces.length} labours with registered faces`);

      // Wait a bit for image to be ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Create image element
      const img = await createImageElement(photoUrl);
      console.log("Image element created for attendance, dimensions:", img.width, "x", img.height);
      
      // Detect all faces in the group photo
      const detectedFaceEmbeddings = await detectAllFaces(img);
      
      if (detectedFaceEmbeddings.length === 0) {
        toast.warning("No faces detected in the photo. Please ensure:\n- Faces are clearly visible\n- Good lighting\n- Try taking the photo again");
        setDetectedFaces([]);
        return;
      }

      console.log(`Detected ${detectedFaceEmbeddings.length} face(s) in group photo`);

      // Create map of labourId -> face embedding
      const labourEmbeddings = new Map<string, number[]>();
      laboursWithFaces.forEach(labour => {
        if (labour.faceEmbedding && labour.faceEmbedding.length > 0) {
          labourEmbeddings.set(labour._id, labour.faceEmbedding);
        }
      });

      // Match detected faces with saved embeddings (lower threshold for better matching)
      const detectedEmbeddings = detectedFaceEmbeddings.map(f => f.embedding);
      const matches = matchFaces(detectedEmbeddings, labourEmbeddings, 0.5); // 0.5 similarity threshold (more lenient)

      // Get matched labour IDs
      const matchedLabourIds = Array.from(matches.keys());
      setDetectedFaces(matchedLabourIds);
      
      // Auto-select matched labours
      setSelectedLabours(matchedLabourIds);
      
      if (matchedLabourIds.length > 0) {
        toast.success(`✓ Detected ${matchedLabourIds.length} of ${laboursWithFaces.length} registered labours`);
      } else {
        toast.warning("No faces matched. You can manually select labours.");
      }
      
      if (matchedLabourIds.length < laboursWithFaces.length && matchedLabourIds.length > 0) {
        toast.info(`${laboursWithFaces.length - matchedLabourIds.length} labour(s) not detected. You can manually select them.`);
      }
    } catch (error: any) {
      console.error("Face recognition error:", error);
      toast.error(`Face recognition failed: ${error.message || 'Unknown error'}. You can manually select labours.`);
      setDetectedFaces([]);
    } finally {
      setIsProcessingFace(false);
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
    if (!location) {
      toast.error("Please capture location. Retry photo capture to get location.");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Upload photo to get URL (if not already uploaded)
      let photoUrl = groupPhotoUrl;
      if (groupPhotoUrl.startsWith('blob:') || groupPhotoUrl.startsWith('file://')) {
        // Need to upload to Cloudinary or similar
        // For now, we'll assume the backend handles base64 or we need to upload first
        // This is a placeholder - you may need to implement photo upload
        toast.info("Uploading photo...");
      }

      await contractorApi.uploadAttendance({
        projectId: selectedProject,
        date: new Date().toISOString(),
        groupPhotoUrl: photoUrl,
        presentLabourIds: selectedLabours,
        detectedFaces: detectedFaces, // Send detected faces for validation
        latitude: location.latitude,
        longitude: location.longitude,
      });
      
      toast.success(`Attendance marked for ${selectedLabours.length} labours!`);
      setSelectedLabours([]);
      setGroupPhotoUrl(undefined);
      setDetectedFaces([]);
      setLocation(null);
      setLocationName(null);
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
                  {projects.filter(Boolean).map((project) => (
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
              disabled={isCapturingLocation || isProcessingFace}
            >
              {isCapturingLocation || isProcessingFace ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isCapturingLocation ? 'Capturing Location...' : 'Processing Faces...'}
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  {groupPhotoUrl ? 'Group Photo Captured ✓' : 'Capture Group Photo'}
                </>
              )}
            </Button>
            
            {location && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{locationName || `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`}</span>
              </div>
            )}
            
            {detectedFaces.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
                <CheckCircle className="w-3 h-3" />
                <span>{detectedFaces.length} face(s) detected and matched</span>
              </div>
            )}
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
                        {!labour.faceEmbedding || labour.faceEmbedding.length === 0 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            No face registered
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {detectedFaces.includes(labour._id) && (
                          <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" title="Face detected" />
                        )}
                        {selectedLabours.includes(labour._id) && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
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
