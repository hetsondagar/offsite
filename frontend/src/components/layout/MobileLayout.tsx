/**
 * Mobile-first app shell.
 * Horizontal scrolling eliminated.
 * Bottom navigation fixed & persistent.
 * Designed to behave like a native mobile app.
 */
import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

interface MobileLayoutProps {
  children: ReactNode;
  role: "engineer" | "manager" | "owner" | "purchase_manager" | "contractor";
  hideNav?: boolean;
}

export function MobileLayout({ children, role, hideNav = false }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      <main className={cn(
        "w-full overflow-x-hidden max-w-full",
        hideNav ? "" : "pb-20 sm:pb-24"
      )} style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
        {children}
      </main>
      {!hideNav && <BottomNav role={role} />}
    </div>
  );
}
