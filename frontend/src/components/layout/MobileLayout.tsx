import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

interface MobileLayoutProps {
  children: ReactNode;
  role: "engineer" | "manager" | "owner";
  hideNav?: boolean;
}

export function MobileLayout({ children, role, hideNav = false }: MobileLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className={hideNav ? "" : "pb-24"}>
        {children}
      </main>
      {!hideNav && <BottomNav role={role} />}
    </div>
  );
}
