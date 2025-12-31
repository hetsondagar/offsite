import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ActionButton } from "@/components/common/ActionButton";
import { StatusBadge } from "@/components/common/StatusBadge";
import { OfflineBanner } from "@/components/common/OfflineBanner";
import { Logo } from "@/components/common/Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { usePermissions } from "@/hooks/usePermissions";
import { FileText, MapPin, Package, ClipboardList, Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { dprApi } from "@/services/api/dpr";
import { attendanceApi } from "@/services/api/attendance";
import { materialsApi } from "@/services/api/materials";

export default function EngineerDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  useEffect(() => {
    // Load recent activity from API
    // This is a simplified version - you can enhance it to fetch actual recent DPRs, attendance, etc.
    setRecentActivity([
      { action: "DPR created", time: "2h ago", status: "success" },
      { action: "Material request submitted", time: "5h ago", status: "success" },
      { action: "Attendance marked", time: "1d ago", status: "success" },
    ]);
    setIsLoading(false);
  }, []);

  return (
    <MobileLayout role="engineer">
      <div className="p-4 space-y-6 safe-area-top">
        {/* Header */}
        <div className="flex flex-col items-center gap-4 opacity-0 animate-fade-up">
          {/* Centered Large Logo */}
          <div className="flex justify-center w-full">
            <Logo size="xl" showText={false} />
          </div>
          
          {/* Time and Theme Toggle */}
          <div className="flex items-center justify-between w-full">
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">{currentTime}</p>
              <p className="text-xs text-muted-foreground">{currentDate}</p>
            </div>
            <ThemeToggle variant="icon" />
          </div>
        </div>

        {/* Offline Banner (demo) */}
        <div className="opacity-0 animate-fade-up stagger-1">
          <OfflineBanner pendingItems={2} />
        </div>

        {/* Today at a Glance */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="w-5 h-5 text-primary" />
              Today at a Glance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Attendance Status */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Checked In</p>
                  <p className="text-xs text-muted-foreground">09:15 AM · Building A</p>
                </div>
              </div>
              <StatusBadge status="success" label="Active" pulse />
            </div>

            {/* Today's Task */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <ClipboardList className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Floor 3 Concrete</p>
                  <p className="text-xs text-muted-foreground">In Progress · 60% done</p>
                </div>
              </div>
              <StatusBadge status="info" label="Active" />
            </div>

            {/* Pending Requests */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">2 Pending Requests</p>
                  <p className="text-xs text-muted-foreground">Cement, Steel bars</p>
                </div>
              </div>
              <StatusBadge status="pending" label="Waiting" />
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="font-display font-semibold text-lg text-foreground opacity-0 animate-fade-up stagger-3">
            Quick Actions
          </h2>
          
          <div className="grid grid-cols-2 gap-3">
            {hasPermission("canCreateDPR") && (
              <div className="opacity-0 animate-fade-up stagger-3">
                <ActionButton
                  icon={FileText}
                  label="Create DPR"
                  sublabel="Daily Report"
                  variant="glow"
                  onClick={() => navigate("/dpr")}
                />
              </div>
            )}
            {hasPermission("canMarkAttendance") && (
              <div className="opacity-0 animate-fade-up stagger-4">
                <ActionButton
                  icon={MapPin}
                  label="Attendance"
                  sublabel="Check In/Out"
                  variant="outline"
                  onClick={() => navigate("/attendance")}
                />
              </div>
            )}
          </div>
          
          {hasPermission("canRaiseMaterialRequest") && (
            <div className="opacity-0 animate-fade-up stagger-5">
              <ActionButton
                icon={Package}
                label="Request Materials"
                sublabel="Raise new request"
                variant="outline"
                onClick={() => navigate("/materials")}
              />
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <Card variant="gradient" className="opacity-0 animate-fade-up stagger-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentActivity.map((item, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <span className="text-sm text-foreground">{item.action}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      item.status === "success" ? "bg-success" : "bg-warning"
                    }`} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MobileLayout>
  );
}
