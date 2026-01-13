import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  icon: LucideIcon;
  label: string;
  sublabel?: string;
  onClick?: () => void;
  variant?: "default" | "glow" | "success" | "outline";
  size?: "default" | "lg" | "xl";
  className?: string;
}

export function ActionButton({ 
  icon: Icon, 
  label, 
  sublabel,
  onClick, 
  variant = "default",
  size = "lg",
  className 
}: ActionButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={cn(
        "w-full flex-col h-auto py-4 sm:py-6 gap-1.5 sm:gap-2 tap-target",
        className
      )}
    >
      <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
      <div className="flex flex-col items-center">
        <span className="font-display font-semibold text-sm sm:text-base">{label}</span>
        {sublabel && (
          <span className="text-[10px] sm:text-xs opacity-80 font-normal">{sublabel}</span>
        )}
      </div>
    </Button>
  );
}
