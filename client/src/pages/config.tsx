import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ConfigPanel, type ConfigFormData } from "@/components/config-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Settings, Trash2, BookOpen, Clock, Pencil } from "lucide-react";
import { Link } from "wouter";
import type { Project } from "@shared/schema";

export default function ConfigPage() {
  const { toast } = useToast();
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createProjectMutation = useMutation({
    mutationFn: async (data: ConfigFormData) => {
      const response = await apiRequest("POST", "/api/projects", data);
      return response.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Proyecto creado",
        description: `"${project.title}" ha sido configurado. Puedes iniciar la generación desde el panel principal.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: number) => {
      await apiRequest("DELETE", `/api/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado correctamente",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, title }: { id: number; title: string }) => {
      const response = await apiRequest("PATCH", `/api/projects/${id}`, { title });
      return response.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingProject(null);
      toast({
        title: "Proyecto actualizado",
        description: `El nombre se ha cambiado a "${project.title}"`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el proyecto",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ConfigFormData) => {
    createProjectMutation.mutate(data);
  };

  const handleDelete = (projectId: number) => {
    if (confirm("¿Estás seguro de que quieres eliminar este proyecto?")) {
      deleteProjectMutation.mutate(projectId);
    }
  };

  const statusLabels: Record<string, string> = {
    idle: "En espera",
    generating: "Generando",
    completed: "Completado",
  };

  const statusColors: Record<string, string> = {
    idle: "bg-muted text-muted-foreground",
    generating: "bg-chart-2/20 text-chart-2",
    completed: "bg-green-500/20 text-green-600 dark:text-green-400",
  };

  return (
    <div className="p-6 space-y-6" data-testid="config-page">
      <div>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tus proyectos y configuraciones de generación
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Nuevo Proyecto
            </CardTitle>
            <CardDescription>
              Configura los parámetros para un nuevo manuscrito
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConfigPanel 
              onSubmit={handleSubmit}
              isLoading={createProjectMutation.isPending}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Proyectos Existentes
            </CardTitle>
            <CardDescription>
              {projects.length} proyecto{projects.length !== 1 ? "s" : ""} creado{projects.length !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="h-8 w-8 text-muted-foreground/30 animate-pulse" />
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground text-sm">
                  No hay proyectos todavía
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  Crea tu primer proyecto usando el formulario
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.map((project) => (
                  <div 
                    key={project.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                    data-testid={`project-item-${project.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">{project.title}</h3>
                        <Badge className={`text-xs ${statusColors[project.status] || statusColors.idle}`}>
                          {statusLabels[project.status] || project.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{project.genre}</Badge>
                        <Badge variant="outline" className="text-xs">{project.tone}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {project.chapterCount} capítulos
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          setEditingProject(project);
                          setEditTitle(project.title);
                        }}
                        data-testid={`button-edit-${project.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Link href="/manuscript">
                        <Button variant="ghost" size="sm" data-testid={`button-view-${project.id}`}>
                          Ver
                        </Button>
                      </Link>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDelete(project.id)}
                        disabled={deleteProjectMutation.isPending}
                        data-testid={`button-delete-${project.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acerca del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Modelo de IA
              </p>
              <p className="font-medium">Gemini 3 Pro Preview</p>
            </div>
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Nivel de Razonamiento
              </p>
              <p className="font-medium">High (Deep Thinking)</p>
            </div>
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Temperatura
              </p>
              <p className="font-medium">1.0</p>
            </div>
            <div className="p-4 rounded-md bg-muted/50">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
                Top P
              </p>
              <p className="font-medium">0.95</p>
            </div>
          </div>
          <Separator />
          <p className="text-sm text-muted-foreground">
            Este sistema utiliza cuatro agentes literarios autónomos (Arquitecto, Narrador, Editor, Estilista) 
            que colaboran para crear manuscritos completos. Cada agente utiliza el motor de razonamiento 
            avanzado de Gemini 3 Pro para planificar y ejecutar sus tareas con máxima coherencia narrativa.
          </p>
        </CardContent>
      </Card>

      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nombre del proyecto</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Nombre del proyecto"
              data-testid="input-edit-title"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (editingProject && editTitle.trim()) {
                  updateProjectMutation.mutate({ id: editingProject.id, title: editTitle.trim() });
                }
              }}
              disabled={updateProjectMutation.isPending || !editTitle.trim()}
              data-testid="button-save-title"
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
