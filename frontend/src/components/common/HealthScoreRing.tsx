import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface HealthScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function HealthScoreRing({ score, size = "md", showLabel = true }: HealthScoreRingProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  const sizes = {
    sm: { width: 90, stroke: 6, fontSize: "text-lg" },
    md: { width: 110, stroke: 6, fontSize: "text-2xl" },
    lg: { width: 120, stroke: 6, fontSize: "text-3xl" },
  };
  
  const { width, stroke, fontSize } = sizes[size];
  const radius = (width - stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  
  const getColor = (value: number) => {
    if (value >= 70) return "stroke-success";
    if (value >= 40) return "stroke-warning";
    return "stroke-destructive";
  };
  
  const getGlowColor = (value: number) => {
    if (value >= 70) return "drop-shadow-[0_0_10px_hsl(var(--success)/0.5)]";
    if (value >= 40) return "drop-shadow-[0_0_10px_hsl(var(--warning)/0.5)]";
    return "drop-shadow-[0_0_10px_hsl(var(--destructive)/0.5)]";
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      let current = 0;
      const increment = score / 30;
      const interval = setInterval(() => {
        current += increment;
        if (current >= score) {
          setAnimatedScore(score);
          clearInterval(interval);
        } else {
          setAnimatedScore(Math.floor(current));
        }
      }, 30);
      return () => clearInterval(interval);
    }, 300);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div className="relative inline-flex flex-shrink-0 flex-col items-center justify-center" style={{ width, height: width }}>
      <svg width={width} height={width} className={cn("transform -rotate-90", getGlowColor(animatedScore))}>
        {/* Background circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-muted"
        />
        {/* Progress circle */}
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn("transition-all duration-1000 ease-out", getColor(animatedScore))}
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-display font-bold text-foreground leading-none", fontSize)}>
          {animatedScore}
        </span>
        {showLabel && (
          <span className="text-xs text-muted-foreground font-medium mt-0.5">Site Health</span>
        )}
      </div>
    </div>
  );
}
