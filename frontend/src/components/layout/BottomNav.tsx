import { Home, FileText, MapPin, Package, User, LayoutDashboard, FolderKanban, CheckSquare, Lightbulb, Receipt, Calendar, Users, Wrench, ShieldCheck, Wallet, Send, History, Camera } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

interface NavItem {
  icon: React.ElementType;
  labelKey: string;
  path: string;
}

const engineerNav: NavItem[] = [
  { icon: Home, labelKey: "navigation.home", path: "/" },
  { icon: CheckSquare, labelKey: "navigation.tasks", path: "/tasks" },
  { icon: FileText, labelKey: "navigation.dpr", path: "/dpr" },
  { icon: Camera, labelKey: "navigation.site360", path: "/site360/upload" },
  { icon: User, labelKey: "navigation.profile", path: "/profile" },
];

const managerNav: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "navigation.dashboard", path: "/" },
  { icon: FolderKanban, labelKey: "navigation.projects", path: "/projects" },
  { icon: CheckSquare, labelKey: "navigation.tasks", path: "/tasks" },
  { icon: Package, labelKey: "navigation.approvals", path: "/approvals" },
  { icon: User, labelKey: "navigation.profile", path: "/profile" },
];

const ownerNav: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "navigation.dashboard", path: "/" },
  { icon: FolderKanban, labelKey: "navigation.projects", path: "/projects" },
  { icon: Wallet, labelKey: "navigation.expenseManager", path: "/expense-manager" },
  { icon: Receipt, labelKey: "navigation.invoices", path: "/invoicing" },
  { icon: User, labelKey: "navigation.profile", path: "/profile" },
];

const purchaseManagerNav: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "navigation.dashboard", path: "/" },
  { icon: Send, labelKey: "navigation.purchaseRequests", path: "/purchase-dashboard" },
  { icon: History, labelKey: "navigation.purchaseHistory", path: "/purchase-history" },
  { icon: Wrench, labelKey: "navigation.tools", path: "/tools" },
  { icon: User, labelKey: "navigation.profile", path: "/profile" },
];

const contractorNav: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "navigation.dashboard", path: "/" },
  { icon: Users, labelKey: "navigation.labours", path: "/contractor/labours" },
  { icon: MapPin, labelKey: "navigation.attendance", path: "/contractor/attendance" },
  { icon: Receipt, labelKey: "navigation.weeklyInvoice", path: "/contractor/weekly-invoice" },
  { icon: User, labelKey: "navigation.profile", path: "/profile" },
];

interface BottomNavProps {
  role: "engineer" | "manager" | "owner" | "purchase_manager" | "contractor";
}

export function BottomNav({ role }: BottomNavProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  
  // Filter nav items based on permissions
  let navItems: NavItem[] = [];
  
  if (role === "engineer") {
    navItems = engineerNav.filter(item => {
      if (item.path === "/dpr") return hasPermission("canCreateDPR");
      if (item.path === "/attendance") return hasPermission("canMarkAttendance");
      if (item.path === "/materials") return hasPermission("canRaiseMaterialRequest");
      if (item.path === "/site360/upload") return hasPermission("canUploadSite360");
      return true; // Home and Profile are always accessible
    });
  } else if (role === "owner") {
    // Owner should see all nav items - they have all permissions
    navItems = ownerNav;
  } else if (role === "purchase_manager") {
    navItems = purchaseManagerNav;
  } else if (role === "contractor") {
    navItems = contractorNav;
  } else {
    navItems = managerNav.filter(item => {
      if (item.path === "/approvals") return hasPermission("canApproveMaterialRequests");
      if (item.path === "/insights") return hasPermission("canViewAIInsights");
      return true;
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/98 backdrop-blur-xl border-t border-border/50 safe-area-bottom shadow-[0_-2px_8px_rgba(0,0,0,0.04)] w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw', overflowX: 'hidden' }}>
      <div className="flex items-center justify-around px-2 py-2 max-w-2xl mx-auto w-full overflow-x-hidden">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center justify-center min-w-[64px] py-2 px-3 rounded-xl transition-all duration-200 active:scale-95 touch-manipulation",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground active:text-foreground"
              )}
            >
              <div className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200",
                isActive && "bg-primary/10"
              )}>
                <Icon className={cn(
                  "w-6 h-6 transition-all duration-200",
                  isActive && "scale-105"
                )} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                )}
              </div>
              <span className={cn(
                "text-[11px] font-medium mt-1 transition-all duration-200 leading-tight",
                isActive && "text-primary font-semibold"
              )}>
                {t(item.labelKey)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
