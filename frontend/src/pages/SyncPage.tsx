import { useTranslation } from "react-i18next";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setSyncing, setLastSyncTime } from "@/store/slices/offlineSlice";
import {
  RefreshCw,
  Check,
  X,
  Loader2,
  WifiOff,
  Wifi,
  FileText,
  MapPin,
  Package,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePendingFromIndexedDB } from "@/hooks/usePendingFromIndexedDB";
import { runSync } from "@/lib/syncEngine";
import { useState, useCallback } from "react";

type SyncStatus = "idle" | "syncing" | "success" | "error";

function getIcon(type: string) {
  switch (type) {
    case "dpr":
      return FileText;
    case "attendance":
      return MapPin;
    case "material":
      return Package;
    default:
      return FileText;
  }
}

function getItemTypeLabel(type: string) {
  switch (type) {
    case "dpr":
      return "DPR";
    case "attendance":
      return "Attendance";
    case "material":
      return "Material Request";
    default:
      return "Item";
  }
}

export default function SyncPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { isOnline, isSyncing, lastSyncTime } = useAppSelector((state) => state.offline);
  const { pendingItems, refresh } = usePendingFromIndexedDB();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");

  const sync = useCallback(async () => {
    if (!isOnline || syncStatus === "syncing") return;
    dispatch(setSyncing(true));
    setSyncStatus("syncing");
    try {
      const result = await runSync();
      dispatch(setLastSyncTime(Date.now()));
      setSyncStatus("success");
      await refresh();
      if (result.failed > 0 && result.errors.length) {
        result.errors.forEach((e) => console.error("[Sync]", e));
      }
    } catch (err) {
      console.error("Sync error:", err);
      setSyncStatus("error");
    } finally {
      dispatch(setSyncing(false));
      setTimeout(() => setSyncStatus("idle"), 2000);
    }
  }, [isOnline, syncStatus, dispatch, refresh]);

  const itemsWithIcon = pendingItems.map((item) => ({
    ...item,
    icon: getIcon(item.type),
  }));

  const sortOrder = (a: { type: string }, b: { type: string }) => {
    const order: Record<string, number> = { attendance: 0, dpr: 1, material: 2 };
    return (order[a.type] ?? 3) - (order[b.type] ?? 3);
  };
  const sorted = [...itemsWithIcon].sort((a, b) => {
    const byType = sortOrder(a, b);
    if (byType !== 0) return byType;
    return (a.timestamp ?? 0) - (b.timestamp ?? 0);
  });

  return (
    <MobileLayout role="engineer">
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: "100vw" }}>
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-3 sm:py-4 pl-0 pr-3 sm:pr-4 safe-area-top w-full">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">{t("sync.title")}</h1>
              <p className="text-xs text-muted-foreground">{t("sync.offlineDataSync")}</p>
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 w-full overflow-x-hidden max-w-full">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
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
                        {isOnline ? t("common.online") : t("common.offline")}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {isOnline ? t("sync.readyToSync") : t("sync.connectToSync")}
                      </p>
                    </div>
                  </div>
                  <StatusBadge
                    status={isOnline ? "success" : "warning"}
                    label={isOnline ? t("sync.connected") : t("common.offline")}
                  />
                </div>
                {lastSyncTime && (
                  <p className="text-xs text-muted-foreground">
                    {t("sync.lastSync")} {new Date(lastSyncTime).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Button
              variant="glow"
              size="lg"
              className="w-full h-16"
              onClick={sync}
              disabled={!isOnline || pendingItems.length === 0 || isSyncing}
            >
              <AnimatePresence mode="wait">
                {syncStatus === "syncing" ? (
                  <motion.div
                    key="syncing"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t("sync.syncing")}</span>
                  </motion.div>
                ) : syncStatus === "success" ? (
                  <motion.div
                    key="success"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex items-center gap-3"
                  >
                    <Check className="w-5 h-5" />
                    <span>{t("sync.syncComplete")}</span>
                  </motion.div>
                ) : syncStatus === "error" ? (
                  <motion.div
                    key="error"
                    initial={{ x: -10 }}
                    animate={{ x: [0, -10, 10, -10, 0] }}
                    className="flex items-center gap-3"
                  >
                    <X className="w-5 h-5" />
                    <span>{t("sync.syncFailed")}</span>
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
                    <span>{t("sync.syncNowWithCount", { count: pendingItems.length })}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card variant="gradient">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {t("sync.pendingItems")} ({pendingItems.length})
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
                      <p className="text-sm">{t("sync.allItemsSynced")}</p>
                    </motion.div>
                  ) : (
                    <div className="space-y-3">
                      {sorted.map((item, index) => {
                        const Icon = item.icon || FileText;
                        const failed = !!item.lastError;
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
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {getItemTypeLabel(item.type)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(item.timestamp ?? 0).toLocaleString()}
                              </p>
                              {failed && item.lastError && (
                                <p className="text-xs text-destructive mt-0.5 truncate" title={item.lastError}>
                                  {item.lastError}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {failed ? (
                                <>
                                  <StatusBadge status="error" label={t("sync.failed") ?? "Failed"} />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={sync}
                                    disabled={!isOnline || isSyncing}
                                    title={t("common.retry")}
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                  </Button>
                                </>
                              ) : (
                                <StatusBadge status="pending" label={t("status.pending") ?? "Pending"} />
                              )}
                            </div>
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
