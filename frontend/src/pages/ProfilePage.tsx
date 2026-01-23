import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { LanguageToggle } from "@/components/common/LanguageToggle";
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
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { usersApi, User } from "@/services/api/users";
import { projectsApi } from "@/services/api/projects";

export default function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { role, name, email, phone, userId } = useAppSelector((state) => state.auth);
  const { isOnline } = useAppSelector((state) => state.offline);
  const [autoSync, setAutoSync] = useState(() => {
    const saved = localStorage.getItem('autoSync');
    return saved !== null ? saved === 'true' : true;
  });
  const [userData, setUserData] = useState<User | null>(null);
  const [assignedProjects, setAssignedProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const handleAutoSyncToggle = () => {
    const newValue = !autoSync;
    setAutoSync(newValue);
    localStorage.setItem('autoSync', String(newValue));
  };

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const user = await usersApi.getMe();
      setUserData(user);
      
      // Load projects - for owners, load all projects; for others, load assigned projects
      if (role === 'owner') {
        // Owners see all projects
        const data = await projectsApi.getAll(1, 100);
        setAssignedProjects(data?.projects || []);
      } else {
        // Engineers and managers see only assigned projects
        if (user.assignedProjects && user.assignedProjects.length > 0) {
          // Extract project IDs (handle both populated objects and string IDs)
          const projectIds = user.assignedProjects.map((project: any) => {
            if (typeof project === 'string') {
              return project;
            }
            // If it's a populated object, get the _id
            if (project && typeof project === 'object') {
              return project._id || project;
            }
            return null;
          }).filter((id: any) => id !== null);

          // Fetch full project details for each ID
          if (projectIds.length > 0) {
            const projectPromises = projectIds.map((projectId: string) => 
              projectsApi.getById(projectId).catch(() => null)
            );
            const projects = await Promise.all(projectPromises);
            // Extract project from response (getById returns { project, statistics })
            setAssignedProjects(projects.filter(p => p !== null && p.project).map(p => p!.project));
          }
        }
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
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        {/* Header */}
        <div className="sticky top-2 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">Profile</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 space-y-4 sm:space-y-6 w-full overflow-x-hidden max-w-full">
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
                        <p className="text-xs text-muted-foreground mt-0.5">{userData?.phone || phone}</p>
                      )}
                      {userData?.offsiteId && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground">OffSite ID:</span>
                          <span className="text-sm font-mono font-bold text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-lg">
                            {userData.offsiteId}
                          </span>
                        </div>
                      )}
                      <div className="mt-2">
                        <StatusBadge 
                          status={role === "owner" ? "success" : "info"} 
                          label={getRoleLabel()} 
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Projects */}
          <Card variant="gradient" className="animate-fade-up stagger-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-medium text-foreground">
                  {role === 'owner' ? 'Current Projects' : 'Assigned Projects'}
                </h3>
              </div>
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                ) : assignedProjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {role === 'owner' ? t('profile.noProjects') : t('profile.noAssignedProjects')}
                  </p>
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
                  type="button"
                  onClick={handleAutoSyncToggle}
                  className={cn(
                    "w-12 h-7 rounded-full transition-all duration-200 relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background",
                    autoSync ? "bg-primary" : "bg-muted"
                  )}
                  aria-label={autoSync ? "Disable auto sync" : "Enable auto sync"}
                  aria-pressed={autoSync}
                >
                  <span 
                    className={cn(
                      "absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out",
                      autoSync ? "translate-x-5" : "translate-x-0"
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

          {/* Language Toggle */}
          <Card variant="gradient" className="animate-fade-up stagger-3">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <LanguageToggle variant="icon" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("settings.language")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.languageDescription")}</p>
                  </div>
                </div>
                <LanguageToggle variant="compact" />
              </div>
            </CardContent>
          </Card>

          {/* Theme Toggle */}
          <Card variant="gradient" className="animate-fade-up stagger-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                    <ThemeToggle variant="icon" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("settings.theme")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.themeDescription")}</p>
                  </div>
                </div>
                <ThemeToggle variant="compact" />
              </div>
            </CardContent>
          </Card>

          {/* Menu Items */}
          <Card variant="gradient" className="animate-fade-up stagger-5">
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
            className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 animate-fade-up stagger-6"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 mr-2" />
            {t("common.logout") || "Logout"}
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
