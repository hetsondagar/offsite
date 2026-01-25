import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MobileLayout } from '@/components/layout/MobileLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { projectsApi } from '@/services/api/projects';
import { Loader2, Camera, ChevronRight, Building2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/PageHeader';
import { useAppSelector } from '@/store/hooks';

export default function Site360ProjectsPage() {
  const navigate = useNavigate();
  const { role } = useAppSelector((state) => state.auth);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setIsLoading(true);
      const data = await projectsApi.getAll(1, 100);
      setProjects(data?.projects || []);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load projects');
      setProjects([]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MobileLayout role={(role as any) || 'manager'}>
      <div className="min-h-screen bg-background w-full overflow-x-hidden max-w-full" style={{ maxWidth: '100vw' }}>
        <PageHeader
          title="SiteLens 360"
          subtitle="View 360° zones uploaded by site engineers"
          showBack={true}
        />

        <div className="p-3 sm:p-4 md:p-6 space-y-4 max-w-4xl mx-auto w-full">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No projects available</p>
              </CardContent>
            </Card>
          ) : (
            projects.filter(Boolean).map((project) => (
              <Card key={project._id} className="animate-fade-up">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        {project.name}
                      </CardTitle>
                      {project.location && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {project.location}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/site360/${project._id}`)}
                    >
                      View
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
}
