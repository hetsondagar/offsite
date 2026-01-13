import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setSyncing, setLastSyncTime, clearSyncedItems } from "@/store/slices/offlineSlice";
import { 
  ArrowLeft, 
  RefreshCw, 
  Check, 
  X, 
  Loader2,
  WifiOff,
  Wifi,
  FileText,
  MapPin,
  Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getUnsyncedDPRs, getUnsyncedAttendance, getUnsyncedMaterials } from "@/lib/indexeddb";
import { syncOfflineStores } from "@/lib/offlineSync";

export default function SyncPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isOnline, isSyncing, lastSyncTime } = useAppSelector((state) => state.offline);
  const [pendingItems, setPendingItems] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');

  useEffect(() => {
    loadPendingItems();
  }, []);

  const loadPendingItems = async () => {
    const dprs = await getUnsyncedDPRs();
    const attendance = await getUnsyncedAttendance();
    const materials = await getUnsyncedMaterials();

    const items = [
      ...dprs.map(dpr => ({ ...dpr, type: 'dpr', icon: FileText })),
      ...attendance.map(att => ({ ...att, type: 'attendance', icon: MapPin })),
      ...materials.map(mat => ({ ...mat, type: 'material', icon: Package })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    setPendingItems(items);
  };

  const handleSync = async () => {
    if (!isOnline || pendingItems.length === 0) return;

    dispatch(setSyncing(true));
    setSyncStatus('syncing');

    try {
      await syncOfflineStores();
      
      // Mark all items as synced
      dispatch(setLastSyncTime(Date.now()));
      setSyncStatus('success');
      
      // Clear synced items after a delay
      setTimeout(() => {
        dispatch(clearSyncedItems());
        loadPendingItems();
      }, 1500);
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus('error');
    } finally {
      dispatch(setSyncing(false));
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  };

  const getItemTypeLabel = (type: string) => {
    switch (type) {
      case 'dpr': return 'DPR';
      case 'attendance': return 'Attendance';
      case 'material': return 'Material Request';
      default: return 'Item';
    }
  };

  return (
    <MobileLayout role="engineer">
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-3 sm:py-4 pl-0 pr-3 sm:pr-4 safe-area-top w-full">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">Sync</h1>
              <p className="text-xs text-muted-foreground">Offline data synchronization</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 w-full overflow-x-hidden max-w-full">
          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card variant="gradient">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {isOnline ? (
                      <div className="p-3 rounded-xl bg-success/10">
                        <Wifi className="w-6 h-6 text-success" />
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-warning/10">
                        <WifiOff className="w-6 h-6 text-warning" />
                      </div>
                    )}
                    <div>
                      <h2 className="font-display font-semibold text-foreground">
                        {isOnline ? 'Online' : 'Offline'}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {isOnline ? 'Ready to sync' : 'Connect to sync'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge 
                    status={isOnline ? "success" : "warning"} 
                    label={isOnline ? "Connected" : "Offline"} 
                  />
                </div>

                {lastSyncTime && (
                  <p className="text-xs text-muted-foreground">
                    Last sync: {new Date(lastSyncTime).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Sync Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Button
              variant="glow"
              size="lg"
              className="w-full h-16"
              onClick={handleSync}
              disabled={!isOnline || pendingItems.length === 0 || isSyncing}
            >
              <AnimatePresence mode="wait">
                {syncStatus === 'syncing' ? (
                  <motion.div
                    key="syncing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Syncing...</span>
                  </motion.div>
                ) : syncStatus === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <Check className="w-5 h-5" />
                    <span>Sync Complete!</span>
                  </motion.div>
                ) : syncStatus === 'error' ? (
                  <motion.div
                    key="error"
                    initial={{ x: -10 }}
                    animate={{ x: [0, -10, 10, -10, 0] }}
                    className="flex items-center gap-3"
                  >
                    <X className="w-5 h-5" />
                    <span>Sync Failed</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <RefreshCw className="w-5 h-5" />
                    <span>Sync Now ({pendingItems.length} items)</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>

          {/* Pending Items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card variant="gradient">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Pending Items ({pendingItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnimatePresence>
                  {pendingItems.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-8 text-muted-foreground"
                    >
                      <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">All items synced</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      {pendingItems.map((item, index) => {
                        const Icon = item.icon || FileText;
                        return (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-3 p-3 rounded-xl bg-muted/50"
                          >
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {getItemTypeLabel(item.type)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.timestamp).toLocaleString()}
                              </p>
                            </div>
                            <StatusBadge status="pending" label="Pending" />
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </MobileLayout>
  );
}

