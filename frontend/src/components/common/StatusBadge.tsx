import { cn } from "@/lib/utils";

type StatusType = "success" | "warning" | "error" | "info" | "pending" | "offline";

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  pulse?: boolean;
}

export function StatusBadge({ status, label, pulse = false }: StatusBadgeProps) {
  const styles = {
    success: "bg-success/20 text-success border-success/30",
    warning: "bg-warning/20 text-warning border-warning/30",
    error: "bg-destructive/20 text-destructive border-destructive/30",
    info: "bg-primary/20 text-primary border-primary/30",
    pending: "bg-muted text-muted-foreground border-muted-foreground/30",
    offline: "bg-muted text-muted-foreground border-muted-foreground/30",
  };

  const dotStyles = {
    success: "bg-success",
    warning: "bg-warning",
    error: "bg-destructive",
    info: "bg-primary",
    pending: "bg-muted-foreground",
    offline: "bg-muted-foreground",
  };

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      styles[status]
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full",
        dotStyles[status],
        pulse && "animate-pulse"
      )} />
      {label}
    </span>
  );
}
