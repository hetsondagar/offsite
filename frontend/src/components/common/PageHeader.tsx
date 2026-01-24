/**
 * Consistent page header component for Android-native feel
 * Provides consistent spacing, alignment, and back navigation
 */
import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backPath?: string;
  rightAction?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  showBack = true,
  backPath,
  rightAction,
  className,
}: PageHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 safe-area-top",
        className
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="shrink-0 h-10 w-10 -ml-1"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="font-display font-semibold text-lg text-foreground truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
        {rightAction && (
          <div className="shrink-0">
            {rightAction}
          </div>
        )}
      </div>
    </div>
  );
}
