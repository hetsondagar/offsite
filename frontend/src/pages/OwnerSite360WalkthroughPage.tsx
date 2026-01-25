import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { site360Api, Site360Node } from '@/services/api/site360';
import { projectsApi } from '@/services/api/projects';
import { Play, Loader2, MapPin, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { SiteLens360Viewer } from '@/modules/site360/SiteLens360Viewer';
import { useAppSelector } from '@/store/hooks';

export default function OwnerSite360WalkthroughPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { role } = useAppSelector((state) => state.auth);
  const [nodes, setNodes] = useState<Site360Node[]>([]);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentNode, setCurrentNode] = useState<Site360Node | null>(null);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [projectId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [nodesData, projectData] = await Promise.all([
        site360Api.getProjectNodes(projectId!),
        projectsApi.getById(projectId!),
      ]);
      setNodes(nodesData || []);
      setProject(projectData?.project || null);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartWalkthrough = () => {
    if (nodes.length === 0) {
      toast.error('No zones available for this project');
      return;
    }

    // Start with first node
    setCurrentNode(nodes[0]);
    setIsViewerOpen(true);
  };

  const handleNodeChange = async (nodeId: string) => {
    try {
      const node = await site360Api.getNode(nodeId);
      setCurrentNode(node);
    } catch (error: any) {
      toast.error('Failed to load next zone');
    }
  };

  const getNode = async (nodeId: string): Promise<Site360Node> => {
    return site360Api.getNode(nodeId);
  };

  if (isViewerOpen && currentNode) {
    return (
      <SiteLens360Viewer
        node={currentNode}
        onNodeChange={handleNodeChange}
        onClose={() => setIsViewerOpen(false)}
        getNode={getNode}
      />
    );
  }

  return (
    <MobileLayout role={role as any || 'owner'}>
      <div className="p-4 space-y-6 safe-area-top">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-foreground">SiteLens Walkthrough 360</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immersive 360° site inspection experience
          </p>
        </motion.div>

        {project && (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-foreground">{project.name}</h2>
                {project.location && (
                  <p className="text-sm text-muted-foreground mt-1">{project.location}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Available Zones ({nodes.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : nodes.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No zones uploaded yet</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Engineers can upload 360° panoramas to enable walkthrough
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {nodes.map((node, index) => (
                  <motion.div
                    key={node._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{node.zoneName}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {node.connections.length} connection
                          {node.connections.length !== 1 ? 's' : ''} available
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setCurrentNode(node);
                          setIsViewerOpen(true);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {nodes.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <Button
                className="w-full"
                size="lg"
                onClick={handleStartWalkthrough}
              >
                <Play className="w-5 h-5 mr-2" />
                Start Walkthrough
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MobileLayout>
  );
}
