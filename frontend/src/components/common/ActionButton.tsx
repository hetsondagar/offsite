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
        "w-full flex-col h-auto py-6 gap-2",
        className
      )}
    >
      <Icon className="w-8 h-8" />
      <div className="flex flex-col items-center">
        <span className="font-display font-semibold text-base">{label}</span>
        {sublabel && (
          <span className="text-xs opacity-80 font-normal">{sublabel}</span>
        )}
      </div>
    </Button>
  );
}
