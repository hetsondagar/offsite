import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { notificationsApi, ProjectInvitation } from "@/services/api/notifications";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { UserPlus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [invitations, setInvitations] = useState<ProjectInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadInvitations();
    // Refresh every 30 seconds
    const interval = setInterval(loadInvitations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadInvitations = async () => {
    try {
      setIsLoading(true);
      const data = await notificationsApi.getMyInvitations();
      setInvitations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading invitations:', error);
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.acceptInvitation(invitationId);
      toast.success('Project invitation accepted!');
      await loadInvitations();
      setIsOpen(false);
      // Refresh the page to show updated projects
      window.location.reload();
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      toast.error(error.message || 'Failed to accept invitation');
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await notificationsApi.rejectInvitation(invitationId);
      toast.success('Invitation rejected');
      await loadInvitations();
    } catch (error: any) {
      console.error('Error rejecting invitation:', error);
      toast.error(error.message || 'Failed to reject invitation');
    }
  };

  const unreadCount = invitations.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm">Project Invitations</h3>
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} pending invitation${unreadCount > 1 ? 's' : ''}` : 'No pending invitations'}
          </p>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : invitations.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground">No pending invitations</p>
            </div>
          ) : (
            <div className="divide-y">
              {invitations.map((invitation) => (
                <Card key={invitation._id} className="border-0 rounded-none">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-sm">
                          {typeof invitation.projectId === 'object' 
                            ? invitation.projectId.name 
                            : 'Project'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Invited as {invitation.role === 'engineer' ? 'Site Engineer' : 'Project Manager'}
                        </p>
                        {typeof invitation.projectId === 'object' && invitation.projectId.location && (
                          <p className="text-xs text-muted-foreground mt-1">
                            📍 {invitation.projectId.location}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAcceptInvitation(invitation._id)}
                        >
                          <UserPlus className="w-3 h-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleRejectInvitation(invitation._id)}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

