import { useState, useEffect } from 'react';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { site360Api, Site360Node } from '@/services/api/site360';
import { projectsApi } from '@/services/api/projects';
import { Camera, Upload, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function EngineerSite360UploadPage() {
  const NONE_CONNECT_VALUE = '__none__';
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [zoneName, setZoneName] = useState('');
  const [connectToNodeId, setConnectToNodeId] = useState('');
  const [existingNodes, setExistingNodes] = useState<Site360Node[]>([]);
  const [panoramaFile, setPanoramaFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingNodes, setIsLoadingNodes] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadExistingNodes();
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll(1, 100);
      setProjects(data?.projects || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load projects');
    }
  };

  const loadExistingNodes = async () => {
    try {
      setIsLoadingNodes(true);
      const nodes = await site360Api.getProjectNodes(selectedProject);
      setExistingNodes(nodes || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load existing zones');
    } finally {
      setIsLoadingNodes(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      setPanoramaFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    if (!zoneName.trim()) {
      toast.error('Please enter a zone name');
      return;
    }

    if (!panoramaFile) {
      toast.error('Please select a panorama image');
      return;
    }

    try {
      setIsLoading(true);
      await site360Api.createNode({
        projectId: selectedProject,
        zoneName: zoneName.trim(),
        connectToNodeId: connectToNodeId || undefined,
        forwardLabel: 'Go Forward',
        backLabel: 'Go Back',
        panorama: panoramaFile,
      });

      toast.success('Site360 zone uploaded successfully!');
      setZoneName('');
      setConnectToNodeId('');
      setPanoramaFile(null);
      // Reset file input
      const fileInput = document.getElementById('panorama-input') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      loadExistingNodes();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload zone');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout role="engineer">
      <div className="p-4 space-y-6 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground">Upload SiteLens 360 Zone</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload immersive 360° panorama images of your construction site
          </p>
        </motion.div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Upload New Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Project Selector */}
              <div className="space-y-2">
                <Label htmlFor="project">Project *</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select a project" />
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

              {/* Zone Name */}
              <div className="space-y-2">
                <Label htmlFor="zoneName">Zone Name *</Label>
                <Input
                  id="zoneName"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g., Entrance, Slab Area, Storage"
                  required
                />
              </div>

              {/* Connect to Existing Zone */}
              {existingNodes.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="connectTo">Connect to Existing Zone (Optional)</Label>
                  <Select
                    value={connectToNodeId}
                    onValueChange={(value) => setConnectToNodeId(value === NONE_CONNECT_VALUE ? '' : value)}
                  >
                    <SelectTrigger id="connectTo">
                      <SelectValue placeholder="Select a zone to connect" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_CONNECT_VALUE}>None</SelectItem>
                      {existingNodes.map((node) => (
                        <SelectItem key={node._id} value={node._id}>
                          {node.zoneName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Panorama Upload */}
              <div className="space-y-2">
                <Label htmlFor="panorama-input">Panorama Image *</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="panorama-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="flex-1"
                    required
                  />
                  {panoramaFile && (
                    <span className="text-sm text-muted-foreground">
                      {panoramaFile.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload an equirectangular 360° panorama image (max 50MB)
                </p>
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Zone
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing Zones */}
        {selectedProject && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Existing Zones ({existingNodes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingNodes ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : existingNodes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No zones uploaded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {existingNodes.map((node) => (
                    <motion.div
                      key={node._id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{node.zoneName}</p>
                          <p className="text-xs text-muted-foreground">
                            {node.connections.length} connection
                            {node.connections.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(node.createdAt).toLocaleDateString()}
                        </div>
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
