import { Home, FileText, MapPin, Package, User, LayoutDashboard, FolderKanban, CheckSquare, Lightbulb, Receipt } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
}

const engineerNav: NavItem[] = [
  { icon: Home, label: "Home", path: "/" },
  { icon: FileText, label: "DPR", path: "/dpr" },
  { icon: MapPin, label: "Attendance", path: "/attendance" },
  { icon: Package, label: "Materials", path: "/materials" },
  { icon: User, label: "Profile", path: "/profile" },
];

const managerNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: FolderKanban, label: "Projects", path: "/projects" },
  { icon: CheckSquare, label: "Approvals", path: "/approvals" },
  { icon: Lightbulb, label: "Insights", path: "/insights" },
  { icon: User, label: "Profile", path: "/profile" },
];

const ownerNav: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: FolderKanban, label: "Projects", path: "/projects" },
  { icon: CheckSquare, label: "Approvals", path: "/approvals" },
  { icon: Lightbulb, label: "Insights", path: "/insights" },
  { icon: Receipt, label: "Invoices", path: "/invoicing" },
  { icon: User, label: "Profile", path: "/profile" },
];

interface BottomNavProps {
  role: "engineer" | "manager" | "owner";
}

export function BottomNav({ role }: BottomNavProps) {
  const location = useLocation();
  const { hasPermission } = usePermissions();
  
  // Filter nav items based on permissions
  let navItems: NavItem[] = [];
  
  if (role === "engineer") {
    navItems = engineerNav.filter(item => {
      if (item.path === "/dpr") return hasPermission("canCreateDPR");
      if (item.path === "/attendance") return hasPermission("canMarkAttendance");
      if (item.path === "/materials") return hasPermission("canRaiseMaterialRequest");
      return true; // Home and Profile are always accessible
    });
  } else if (role === "owner") {
    navItems = ownerNav.filter(item => {
      if (item.path === "/approvals") return hasPermission("canApproveMaterialRequests");
      if (item.path === "/insights") return hasPermission("canViewAIInsights");
      if (item.path === "/invoicing") return hasPermission("canViewInvoices") || hasPermission("canManageInvoices");
      return true;
    });
  } else {
    navItems = managerNav.filter(item => {
      if (item.path === "/approvals") return hasPermission("canApproveMaterialRequests");
      if (item.path === "/insights") return hasPermission("canViewAIInsights");
      return true;
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border/50 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-xl transition-all duration-300",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className={cn(
                "relative p-2 rounded-xl transition-all duration-300",
                isActive && "bg-primary/20"
              )}>
                <Icon className={cn(
                  "w-6 h-6 transition-all duration-300",
                  isActive && "scale-110"
                )} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-bounce-in" />
                )}
              </div>
              <span className={cn(
                "text-[11px] font-medium mt-1 transition-all duration-300",
                isActive && "text-primary font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
