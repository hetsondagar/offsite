import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  role: "engineer" | "manager" | "owner";
  hideNav?: boolean;
}

export function MobileLayout({ children, role, hideNav = false }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden">
      <main className={cn(
        "w-full overflow-x-hidden",
        hideNav ? "" : "pb-20 sm:pb-24"
      )}>
        {children}
      </main>
      {!hideNav && <BottomNav role={role} />}
    </div>
  );
}
