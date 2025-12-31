import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OfflineBannerProps {
  pendingItems?: number;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function OfflineBanner({ pendingItems = 0, onSync, isSyncing = false }: OfflineBannerProps) {
  return (
    <div className="bg-warning/10 border border-warning/30 rounded-xl p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-warning/20">
          <WifiOff className="w-4 h-4 text-warning" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Offline Mode</p>
          {pendingItems > 0 && (
            <p className="text-xs text-muted-foreground">
              {pendingItems} item{pendingItems !== 1 ? 's' : ''} pending sync
            </p>
          )}
        </div>
      </div>
      {onSync && (
        <Button 
          variant="ghost" 
          size="icon-sm" 
          onClick={onSync}
          disabled={isSyncing}
        >
          <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
        </Button>
      )}
    </div>
  );
}
