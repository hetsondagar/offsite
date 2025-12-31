import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number | string;
  suffix?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "destructive";
  delay?: number;
}

export function KPICard({ 
  title, 
  value, 
  suffix = "", 
  icon: Icon, 
  trend,
  trendValue,
  variant = "default",
  delay = 0 
}: KPICardProps) {
  const [displayValue, setDisplayValue] = useState(typeof value === "number" ? 0 : value);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isVisible || typeof value !== "number") return;
    
    let current = 0;
    const increment = value / 20;
    const interval = setInterval(() => {
      current += increment;
      if (current >= value) {
        setDisplayValue(value);
        clearInterval(interval);
      } else {
        setDisplayValue(Math.floor(current));
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [value, isVisible]);

  const variantStyles = {
    default: "border-border/50",
    success: "border-success/30 bg-success/5",
    warning: "border-warning/30 bg-warning/5",
    destructive: "border-destructive/30 bg-destructive/5",
  };

  const iconStyles = {
    default: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
  };

  return (
    <Card 
      className={cn(
        "opacity-0 translate-y-4 transition-all duration-500",
        isVisible && "opacity-100 translate-y-0",
        variantStyles[variant]
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </p>
            <p className="font-display text-2xl font-bold text-foreground mt-1">
              {displayValue}{suffix}
            </p>
            {trend && trendValue && (
              <p className={cn(
                "text-xs font-medium mt-1",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "neutral" && "text-muted-foreground"
              )}>
                {trend === "up" && "↑"} {trend === "down" && "↓"} {trendValue}
              </p>
            )}
          </div>
          <div className={cn("p-3 rounded-xl", iconStyles[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
