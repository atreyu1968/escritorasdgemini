import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WorldBibleDisplay } from "@/components/world-bible-display";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import type { Project, WorldBible } from "@shared/schema";

export default function WorldBiblePage() {
  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const latestProject = projects[0];

  const { data: worldBible, isLoading: worldBibleLoading } = useQuery<WorldBible>({
    queryKey: ["/api/projects", latestProject?.id, "world-bible"],
    enabled: !!latestProject?.id,
  });

  if (projectsLoading || worldBibleLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Cargando biblia del mundo...</p>
        </div>
      </div>
    );
  }

  if (!latestProject) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <Globe className="h-16 w-16 text-muted-foreground/20 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Sin biblia del mundo</h2>
        <p className="text-muted-foreground max-w-md">
          Crea un nuevo proyecto desde el panel de control para generar la biblia del mundo
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="world-bible-page">
      <div>
        <h1 className="text-3xl font-bold">Biblia del Mundo</h1>
        <div className="flex items-center gap-3 mt-2">
          <p className="text-muted-foreground">
            Documento de referencia para: <span className="font-medium text-foreground">{latestProject.title}</span>
          </p>
          <Badge variant="secondary">{latestProject.genre}</Badge>
          <Badge variant="outline">{latestProject.tone}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Universo Narrativo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WorldBibleDisplay worldBible={worldBible || null} />
        </CardContent>
      </Card>
    </div>
  );
}
