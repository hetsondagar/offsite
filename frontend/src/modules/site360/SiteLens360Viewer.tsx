import { useEffect, useRef, useState } from 'react';
import Marzipano from 'marzipano';
import { Site360Node, Site360Connection } from '@/services/api/site360';
import { X, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SiteLens360ViewerProps {
  node: Site360Node;
  onNodeChange: (nodeId: string) => void;
  onClose: () => void;
  getNode: (nodeId: string) => Promise<Site360Node>;
}

export function SiteLens360Viewer({
  node,
  onNodeChange,
  onClose,
  getNode,
}: SiteLens360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Marzipano.Viewer | null>(null);
  const sceneRef = useRef<Marzipano.Scene | null>(null);
  const [currentNode, setCurrentNode] = useState<Site360Node>(node);
  const [isLoading, setIsLoading] = useState(false);

  // Get full image URL
  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    return `${apiUrl}${imageUrl}`;
  };

  // Load scene
  const loadScene = async (targetNode: Site360Node) => {
    if (!containerRef.current || !viewerRef.current) return;

    setIsLoading(true);

    try {
      // Create new scene
      const source = Marzipano.ImageUrlSource.fromString(
        getImageUrl(targetNode.imageUrl)
      );

      const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
      const limiter = Marzipano.RectilinearView.limit.traditional(4096, 100 * Math.PI / 180);
      const view = new Marzipano.RectilinearView({ fov: Math.PI / 2 }, limiter);

      const scene = viewerRef.current.createScene({
        source,
        geometry,
        view,
      });

      // Switch to the new scene with a smooth transition
      scene.switchTo({
        transitionDuration: 500,
      });

      // Destroy old scene after transition
      if (sceneRef.current) {
        setTimeout(() => {
          sceneRef.current?.destroy();
        }, 600);
      }

      sceneRef.current = scene;

      // Add hotspots for connections
      targetNode.connections.forEach((connection) => {
        addHotspot(scene, connection.label, async () => {
          try {
            const targetNodeId =
              typeof connection.targetNodeId === 'string'
                ? connection.targetNodeId
                : connection.targetNodeId._id;

            const nextNode = await getNode(targetNodeId);
            setCurrentNode(nextNode);
            onNodeChange(targetNodeId);
          } catch (error) {
            console.error('Failed to load next node:', error);
          }
        });
      });
    } catch (error) {
      console.error('Failed to load scene:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add hotspot
  const addHotspot = (
    scene: Marzipano.Scene,
    label: string,
    onClick: () => void
  ) => {
    const hotspotElement = document.createElement('div');
    hotspotElement.className = 'marzipano-hotspot';
    hotspotElement.style.cssText = `
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.8);
      border: 3px solid white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    // Add arrow icon
    const arrowIcon = document.createElement('div');
    arrowIcon.innerHTML = '⬆️';
    arrowIcon.style.cssText = 'font-size: 24px;';
    hotspotElement.appendChild(arrowIcon);

    // Add label
    const labelElement = document.createElement('div');
    labelElement.textContent = label;
    labelElement.style.cssText = `
      position: absolute;
      bottom: -30px;
      left: 50%;
      transform: translateX(-50%);
      white-space: nowrap;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      pointer-events: none;
    `;
    hotspotElement.appendChild(labelElement);

    // Hover effect
    hotspotElement.addEventListener('mouseenter', () => {
      hotspotElement.style.transform = 'scale(1.2)';
      hotspotElement.style.background = 'rgba(59, 130, 246, 1)';
    });
    hotspotElement.addEventListener('mouseleave', () => {
      hotspotElement.style.transform = 'scale(1)';
      hotspotElement.style.background = 'rgba(59, 130, 246, 0.8)';
    });

    hotspotElement.addEventListener('click', onClick);

    // Position hotspot at bottom center (looking forward)
    const hotspot = scene.hotspotContainer().createHotspot(
      hotspotElement,
      { yaw: 0, pitch: -0.5 } // Bottom center
    );
  };

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current) return;

    const viewer = new Marzipano.Viewer(containerRef.current, {
      controls: {
        mouseViewMode: 'drag',
      },
      stage: {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      },
    });

    viewerRef.current = viewer;

    // Wait a bit for viewer to be ready before loading scene
    const timer = setTimeout(() => {
      loadScene(currentNode);
    }, 100);

    return () => {
      clearTimeout(timer);
      if (sceneRef.current) {
        sceneRef.current.destroy();
        sceneRef.current = null;
      }
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, []);

  // Reload scene when node changes
  useEffect(() => {
    if (viewerRef.current && currentNode) {
      loadScene(currentNode);
    }
  }, [currentNode._id]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Viewer Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="text-white text-lg">Loading...</div>
        </div>
      )}

      {/* Controls Overlay */}
      <div className="absolute top-4 left-4 z-20">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          className="bg-white/90 hover:bg-white"
        >
          <X className="w-4 h-4 mr-2" />
          Close
        </Button>
      </div>

      {/* Zone Info */}
      <div className="absolute top-4 right-4 z-20 bg-black/70 text-white px-4 py-2 rounded-lg">
        <div className="text-sm font-semibold">{currentNode.zoneName}</div>
        {typeof currentNode.projectId === 'object' && (
          <div className="text-xs text-gray-300">{currentNode.projectId.name}</div>
        )}
      </div>

      {/* Connection Info */}
      {currentNode.connections.length > 0 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/70 text-white px-4 py-2 rounded-lg">
          <div className="text-xs text-center">
            {currentNode.connections.length} connection
            {currentNode.connections.length !== 1 ? 's' : ''} available
          </div>
        </div>
      )}
    </div>
  );
}
