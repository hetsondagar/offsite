import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "default" | "plain";
}

export function Logo({ size = "md", showText = true, variant = "default" }: LogoProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sizes = {
    sm: { image: "h-6", text: "text-lg", container: "gap-2" },
    md: { image: "h-8", text: "text-2xl", container: "gap-3" },
    lg: { image: "h-32", text: "text-4xl", container: "gap-4" },
  };

  // Use light logo for light mode, dark logo for dark mode
  const logoSrc = mounted && theme === "dark" ? "/logodark.png" : "/logo.png";

  if (variant === "plain") {
    return (
      <div className="flex items-center justify-center">
        {mounted ? (
          <img 
            src={logoSrc} 
            alt="OffSite Logo" 
            className={cn("object-contain", sizes[size].image)}
          />
        ) : (
          <div className={cn("bg-transparent", sizes[size].image, sizes[size].image.replace("h-", "w-"))} />
        )}
        {showText && (
          <span className={cn("font-display font-bold text-foreground", sizes[size].text)}>
            Off<span className="text-primary">Site</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center", sizes[size].container)}>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/30 blur-xl rounded-full" />
        <div className="relative p-2 bg-primary/10 rounded-xl border border-primary/30 flex items-center justify-center">
          {mounted ? (
            <img 
              src={logoSrc} 
              alt="OffSite Logo" 
              className={cn("object-contain", sizes[size].image)}
            />
          ) : (
            <div className={cn("bg-primary/20 rounded", sizes[size].image, sizes[size].image.replace("h-", "w-"))} />
          )}
        </div>
      </div>
      {showText && (
        <span className={cn("font-display font-bold text-foreground", sizes[size].text)}>
          Off<span className="text-primary">Site</span>
        </span>
      )}
    </div>
  );
}
