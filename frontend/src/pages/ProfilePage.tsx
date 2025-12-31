import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Logo } from "@/components/common/Logo";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { 
  ArrowLeft, 
  User as UserIcon,
  Building2,
  LogOut,
  ChevronRight,
  Bell,
  Shield,
  HelpCircle,
  RefreshCw,
  Wifi,
  WifiOff,
  Crown,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { usersApi, User } from "@/services/api/users";
import { projectsApi } from "@/services/api/projects";

export default function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { role, name, email, phone, userId } = useAppSelector((state) => state.auth);
  const { isOnline } = useAppSelector((state) => state.offline);
  const [autoSync, setAutoSync] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const user = await usersApi.getMe();
      setUserData(user);
      
      // Load assigned projects
      if (user.assignedProjects && user.assignedProjects.length > 0) {
        const projectPromises = user.assignedProjects.map((projectId: string) => 
          projectsApi.getById(projectId).catch(() => null)
        );
        const projects = await Promise.all(projectPromises);
        setAssignedProjects(projects.filter(p => p !== null));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const getRoleLabel = () => {
    switch (role) {
      case "engineer": return "Site Engineer";
      case "manager": return "Project Manager";
      case "owner": return "Owner / Admin";
      default: return "User";
    }
  };

  const menuItems = [
    { icon: Bell, label: "Notifications", value: "On" },
    { icon: Shield, label: "Security", value: "" },
    { icon: HelpCircle, label: "Help & Support", value: "" },
  ];

  if (!role) {
    return null;
  }

  return (
    <MobileLayout role={role}>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="-ml-2">
              <Logo size="md" showText={false} />
            </div>
            <h1 className="font-display font-semibold text-lg ml-0">Profile</h1>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Profile Card */}
          <Card variant="gradient" className="animate-fade-up">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                  {role === "owner" ? (
                    <Crown className="w-8 h-8 text-primary" />
                  ) : (
                    <UserIcon className="w-8 h-8 text-primary" />
                  )}
                </div>
                <div className="flex-1">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <h2 className="font-display font-semibold text-lg text-foreground">
                        {userData?.name || name || "User"}
                      </h2>
                      <p className="text-sm text-muted-foreground">{userData?.email || email || "user@example.com"}</p>
                      {(userData?.phone || phone) && (
                        <p className="text-xs text-muted-foreground">{userData?.phone || phone}</p>
                      )}
                      <StatusBadge 
                        status={role === "owner" ? "success" : "info"} 
                        label={getRoleLabel()} 
                      />
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Projects */}
          <Card variant="gradient" className="animate-fade-up stagger-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground">Assigned Projects</h3>
              </div>
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                ) : assignedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No assigned projects</p>
                ) : (
                  assignedProjects.map((project) => (
                    <div 
                      key={project._id}
                      className="p-3 rounded-xl bg-muted/50 flex items-center justify-between cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => navigate("/projects")}
                    >
                      <span className="text-sm text-foreground">{project.name}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Sync Settings */}
          <Card variant="gradient" className="animate-fade-up stagger-2">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-medium text-foreground">Sync Settings</h3>
              
              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  {isOnline ? (
                    <Wifi className="w-5 h-5 text-success" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="text-sm text-foreground">Connection Status</p>
                    <p className="text-xs text-muted-foreground">
                      {isOnline ? "Connected" : "Offline"}
                    </p>
                  </div>
                </div>
                <StatusBadge 
                  status={isOnline ? "success" : "offline"} 
                  label={isOnline ? "Online" : "Offline"}
                  pulse={isOnline}
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div className="flex items-center gap-3">
                  <RefreshCw className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm text-foreground">Auto Sync</p>
                    <p className="text-xs text-muted-foreground">Sync when online</p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoSync(!autoSync)}
                  className={cn(
                    "w-12 h-7 rounded-full transition-colors relative",
                    autoSync ? "bg-primary" : "bg-muted"
                  )}
                >
                  <span 
                    className={cn(
                      "absolute top-1 w-5 h-5 rounded-full bg-foreground transition-transform",
                      autoSync ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/sync")}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync Now
              </Button>
            </CardContent>
          </Card>

          {/* Theme Toggle */}
          <Card variant="gradient" className="animate-fade-up stagger-3">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <ThemeToggle variant="icon" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Theme</p>
                    <p className="text-xs text-muted-foreground">Switch between light and dark</p>
                  </div>
                </div>
                <ThemeToggle variant="compact" />
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
          <Card variant="gradient" className="animate-fade-up stagger-4">
            <CardContent className="p-2">
              {menuItems.map((item, index) => (
                <button
                  key={index}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                    <span className="text-sm text-foreground">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.value && (
                      <span className="text-xs text-muted-foreground">{item.value}</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Logout */}
          <Button
            variant="outline"
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 animate-fade-up stagger-4"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-2" />
            Logout
          </Button>

          {/* Version */}
          <p className="text-center text-xs text-muted-foreground">
            OffSite v1.0.0
          </p>
        </div>
      </div>
    </MobileLayout>
  );
}
