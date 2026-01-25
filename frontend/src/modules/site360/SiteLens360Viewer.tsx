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
  const loadTokenRef = useRef(0);
  const hotspotsTimerRef = useRef<number | null>(null);
  const [currentNode, setCurrentNode] = useState<Site360Node>(node);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Get full image URL
  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    // Our backend serves static uploads at /uploads (not /api/uploads).
    // If VITE_API_URL ends with /api, strip it for asset URLs.
    const baseUrl = configuredApiUrl.replace(/\/(api)\/?$/i, '');
    return `${baseUrl}${imageUrl}`;
  };

  const preloadImage = (url: string) =>
    new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = url;
    });

  // Load scene
  const loadScene = async (targetNode: Site360Node) => {
    if (!containerRef.current || !viewerRef.current) {
      console.warn('Viewer or container not ready');
      return;
    }

    // Check if viewer is properly initialized
    if (!viewerRef.current.stage() || !viewerRef.current.stage().renderLoop) {
      console.warn('Viewer stage not ready, waiting...');
      setTimeout(() => loadScene(targetNode), 100);
      return;
    }

    loadTokenRef.current += 1;
    const myToken = loadTokenRef.current;

    setIsLoading(true);
    setLoadError(null);

    try {
      // Destroy old scene first
      if (sceneRef.current) {
        try {
          sceneRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        sceneRef.current = null;
      }

      if (hotspotsTimerRef.current) {
        window.clearTimeout(hotspotsTimerRef.current);
        hotspotsTimerRef.current = null;
      }

      // Create new scene
      const imageUrl = getImageUrl(targetNode.imageUrl);

      // Preload to fail fast (prevents Marzipano getting into a bad state on 404)
      await preloadImage(imageUrl);

      // If a newer load started or viewer was destroyed, abort.
      if (myToken !== loadTokenRef.current || !viewerRef.current) {
        return;
      }

      const source = Marzipano.ImageUrlSource.fromString(imageUrl);

      const geometry = new Marzipano.EquirectGeometry([{ width: 4000 }]);
      const limiter = Marzipano.RectilinearView.limit.traditional(4096, 100 * Math.PI / 180);
      const view = new Marzipano.RectilinearView({ fov: Math.PI / 2 }, limiter);

      const scene = viewerRef.current.createScene({
        source,
        geometry,
        view,
      });

      sceneRef.current = scene;

      // Switch to the new scene with a smooth transition
      scene.switchTo({
        transitionDuration: 500,
      });

      // Wait a bit before adding hotspots to ensure scene is loaded
      hotspotsTimerRef.current = window.setTimeout(() => {
        if (myToken !== loadTokenRef.current || !sceneRef.current) return;
        // Add hotspots for connections
        if (targetNode.connections && targetNode.connections.length > 0) {
          targetNode.connections.forEach((connection) => {
            try {
              addHotspot(scene, connection.label, async () => {
                try {
                  const targetNodeId =
                    typeof connection.targetNodeId === 'string'
                      ? connection.targetNodeId
                      : (connection.targetNodeId as any)?._id || connection.targetNodeId;

                  const nextNode = await getNode(targetNodeId);
                  setCurrentNode(nextNode);
                  onNodeChange(targetNodeId);
                } catch (error) {
                  console.error('Failed to load next node:', error);
                }
              });
            } catch (error) {
              console.error('Failed to add hotspot:', error);
            }
          });
        }
      }, 300);
    } catch (error) {
      console.error('Failed to load scene:', error);
      setLoadError('Failed to load panorama image. Please try again.');
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
    try {
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
        position: relative;
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

      hotspotElement.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
      });

      // Get hotspot container and create hotspot
      const hotspotContainer = scene.hotspotContainer();
      if (hotspotContainer) {
        hotspotContainer.createHotspot(
          hotspotElement,
          { yaw: 0, pitch: -0.5 } // Bottom center
        );
      }
    } catch (error) {
      console.error('Failed to create hotspot:', error);
    }
  };

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current) return;

    // Ensure container has dimensions
    if (containerRef.current.clientWidth === 0 || containerRef.current.clientHeight === 0) {
      // Wait for container to have dimensions
      const checkDimensions = setInterval(() => {
        if (containerRef.current && containerRef.current.clientWidth > 0 && containerRef.current.clientHeight > 0) {
          clearInterval(checkDimensions);
          initializeViewer();
        }
      }, 100);
      return () => clearInterval(checkDimensions);
    } else {
      initializeViewer();
    }

    function initializeViewer() {
      if (!containerRef.current) return;

      try {
        const viewer = new Marzipano.Viewer(containerRef.current, {
          controls: {
            mouseViewMode: 'drag',
          },
        });

        viewerRef.current = viewer;

        // Wait for viewer to be fully initialized before loading scene
        const timer = setTimeout(() => {
          if (viewerRef.current && currentNode) {
            loadScene(currentNode);
          }
        }, 200);

        return () => {
          clearTimeout(timer);
          if (sceneRef.current) {
            try {
              sceneRef.current.destroy();
            } catch (e) {
              // Ignore destroy errors
            }
            sceneRef.current = null;
          }
          if (viewerRef.current) {
            try {
              viewerRef.current.destroy();
            } catch (e) {
              // Ignore destroy errors
            }
            viewerRef.current = null;
          }
        };
      } catch (error) {
        console.error('Failed to initialize Marzipano viewer:', error);
      }
    }

    return () => {
      loadTokenRef.current += 1;
      if (hotspotsTimerRef.current) {
        window.clearTimeout(hotspotsTimerRef.current);
        hotspotsTimerRef.current = null;
      }
      if (sceneRef.current) {
        try {
          sceneRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        sceneRef.current = null;
      }
      if (viewerRef.current) {
        try {
          viewerRef.current.destroy();
        } catch (e) {
          // Ignore destroy errors
        }
        viewerRef.current = null;
      }
    };
  }, []);

  // Reload scene when node changes
  useEffect(() => {
    if (viewerRef.current && currentNode && viewerRef.current.stage()?.renderLoop) {
      // Only reload if viewer is properly initialized
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

      {/* Error Overlay */}
      {loadError && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10 px-6">
          <div className="text-white text-center">
            <div className="text-lg font-semibold mb-2">Unable to load</div>
            <div className="text-sm text-white/80">{loadError}</div>
          </div>
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
