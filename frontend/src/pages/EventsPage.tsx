import { useState, useEffect } from "react";
import { MobileLayout } from "@/components/layout/MobileLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Logo } from "@/components/common/Logo";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, 
  Plus,
  Calendar,
  MapPin,
  Users,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle,
  X,
  Building2,
  ClipboardCheck,
  Truck,
  Shield,
  Wrench,
  MoreHorizontal
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { eventsApi, Event } from "@/services/api/events";
import { projectsApi } from "@/services/api/projects";
import { useAppSelector } from "@/store/hooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const eventTypeIcons = {
  meeting: Calendar,
  inspection: ClipboardCheck,
  delivery: Truck,
  safety: Shield,
  maintenance: Wrench,
  other: MoreHorizontal,
};

const eventTypeColors = {
  meeting: "bg-blue-500/10 text-blue-500 border-blue-500/30",
  inspection: "bg-purple-500/10 text-purple-500 border-purple-500/30",
  delivery: "bg-green-500/10 text-green-500 border-green-500/30",
  safety: "bg-red-500/10 text-red-500 border-red-500/30",
  maintenance: "bg-orange-500/10 text-orange-500 border-orange-500/30",
  other: "bg-gray-500/10 text-gray-500 border-gray-500/30",
};

export default function EventsPage() {
  const navigate = useNavigate();
  const { userId } = useAppSelector((state) => state.auth);
  const [events, setEvents] = useState<Event[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    projectId: "",
    title: "",
    description: "",
    type: "meeting" as Event['type'],
    startDate: "",
    endDate: "",
    location: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [eventsData, projectsData] = await Promise.all([
        eventsApi.getAll(),
        projectsApi.getAll(1, 100),
      ]);
      setEvents(eventsData?.events || []);
      setProjects(projectsData?.projects || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!formData.projectId || !formData.title || !formData.startDate) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      setIsCreating(true);
      await eventsApi.create({
        ...formData,
        attendees: [],
        reminders: [],
      });
      setShowCreateDialog(false);
      setFormData({
        projectId: "",
        title: "",
        description: "",
        type: "meeting",
        startDate: "",
        endDate: "",
        location: "",
      });
      loadData();
    } catch (error: any) {
      alert(error.message || "Failed to create event");
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p._id === projectId);
    return project?.name || "Unknown Project";
  };

  return (
    <MobileLayout role="manager">
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-border/50 py-4 pl-0 pr-4 safe-area-top">
          <div className="flex items-center gap-0 relative">
            <div className="absolute left-0 mt-3">
              <Logo size="md" showText={false} />
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <h1 className="font-display font-semibold text-lg">Events</h1>
              <p className="text-xs text-muted-foreground">Schedule & manage events</p>
            </div>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="icon" variant="glow">
                  <Plus className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Event</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Project *</label>
                    <Select value={formData.projectId} onValueChange={(value) => setFormData({...formData, projectId: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project._id} value={project._id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Event Title *</label>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData({...formData, title: e.target.value})}
                      placeholder="Enter event title"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Event Type *</label>
                    <Select value={formData.type} onValueChange={(value: Event['type']) => setFormData({...formData, type: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="meeting">Meeting</SelectItem>
                        <SelectItem value="inspection">Inspection</SelectItem>
                        <SelectItem value="delivery">Delivery</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date & Time *</label>
                    <Input
                      type="datetime-local"
                      value={formData.startDate}
                      onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <Input
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Event location"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="Event description"
                      rows={3}
                    />
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleCreateEvent}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Create Event"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : events.length === 0 ? (
            <Card variant="gradient">
              <CardContent className="p-8 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground">No events scheduled</p>
                <p className="text-sm text-muted-foreground">Create your first event to get started</p>
              </CardContent>
            </Card>
          ) : (
            events.map((event, index) => {
              const Icon = eventTypeIcons[event.type];
              const colorClass = eventTypeColors[event.type];
              
              return (
                <Card
                  key={event._id}
                  variant="gradient"
                  className={cn("opacity-0 animate-fade-up", colorClass)}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn("p-3 rounded-xl border", colorClass)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-display font-semibold text-foreground">{event.title}</h3>
                          <StatusBadge
                            status={
                              event.status === 'completed' ? 'success' :
                              event.status === 'in-progress' ? 'info' :
                              event.status === 'cancelled' ? 'error' : 'pending'
                            }
                            label={event.status}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">{getProjectName(event.projectId)}</p>
                        {event.description && (
                          <p className="text-sm text-foreground mb-3">{event.description}</p>
                        )}
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(event.startDate)}</span>
                          </div>
                          {event.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3" />
                              <span>{event.location}</span>
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3" />
                              <span>{event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MobileLayout>
  );
}

