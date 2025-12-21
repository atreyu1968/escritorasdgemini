import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AgentCard } from "@/components/agent-card";
import { ProcessFlow } from "@/components/process-flow";
import { ConsoleOutput, type LogEntry } from "@/components/console-output";
import { ConfigPanel, type ConfigFormData } from "@/components/config-panel";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Play, StopCircle, FileText, Clock, CheckCircle, Pencil, X } from "lucide-react";
import type { Project, AgentStatus, Chapter } from "@shared/schema";

type AgentRole = "architect" | "ghostwriter" | "editor" | "copyeditor";

const agentNames = {
  architect: "El Arquitecto",
  ghostwriter: "El Narrador",
  editor: "El Editor",
  copyeditor: "El Estilista",
};

export default function Dashboard() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [currentStage, setCurrentStage] = useState<AgentRole | null>(null);
  const [completedStages, setCompletedStages] = useState<AgentRole[]>([]);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: agentStatuses = [] } = useQuery<AgentStatus[]>({
    queryKey: ["/api/agent-statuses"],
    refetchInterval: 2000,
  });

  const activeProject = projects.find(p => p.status !== "completed" && p.status !== "idle");
  const latestProject = projects[0];

  const { data: chapters = [] } = useQuery<Chapter[]>({
    queryKey: ["/api/projects", latestProject?.id, "chapters"],
    enabled: !!latestProject?.id,
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
        description: `"${project.title}" está siendo generado...`,
      });
      addLog("info", `Proyecto "${project.title}" iniciado`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el proyecto",
        variant: "destructive",
      });
      addLog("error", `Error al crear proyecto: ${error.message}`);
    },
  });

  const startGenerationMutation = useMutation({
    mutationFn: async (projectId: number) => {
      const response = await apiRequest("POST", `/api/projects/${projectId}/generate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      addLog("info", "Generación iniciada");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo iniciar la generación",
        variant: "destructive",
      });
      addLog("error", `Error: ${error.message}`);
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ConfigFormData }) => {
      const response = await apiRequest("PATCH", `/api/projects/${id}`, data);
      return response.json();
    },
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setEditingProject(null);
      toast({
        title: "Proyecto actualizado",
        description: `"${project.title}" ha sido actualizado`,
      });
      addLog("info", `Proyecto "${project.title}" actualizado`);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el proyecto",
        variant: "destructive",
      });
      addLog("error", `Error al actualizar: ${error.message}`);
    },
  });

  const addLog = (type: LogEntry["type"], message: string, agent?: string) => {
    const newLog: LogEntry = {
      id: crypto.randomUUID(),
      type,
      message,
      timestamp: new Date(),
      agent,
    };
    setLogs(prev => [...prev, newLog]);
  };

  useEffect(() => {
    if (activeProject) {
      const eventSource = new EventSource(`/api/projects/${activeProject.id}/stream`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "agent_status") {
            const role = data.role as AgentRole;
            if (data.status === "thinking") {
              setCurrentStage(role);
              addLog("thinking", data.message || `${agentNames[role]} está procesando...`, role);
            } else if (data.status === "writing") {
              addLog("writing", data.message || `${agentNames[role]} está escribiendo...`, role);
            } else if (data.status === "editing") {
              addLog("editing", data.message || `${agentNames[role]} está revisando...`, role);
            } else if (data.status === "completed") {
              setCompletedStages(prev => prev.includes(role) ? prev : [...prev, role]);
              addLog("success", data.message || `${agentNames[role]} completó su tarea`, role);
            }
          } else if (data.type === "chapter_complete") {
            addLog("success", `Capítulo ${data.chapterNumber} completado (${data.wordCount} palabras)`);
            queryClient.invalidateQueries({ queryKey: ["/api/projects", activeProject.id, "chapters"] });
          } else if (data.type === "project_complete") {
            addLog("success", "¡Manuscrito completado!");
            toast({
              title: "¡Manuscrito completado!",
              description: "Tu novela ha sido generada exitosamente",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
            setCurrentStage(null);
          } else if (data.type === "error") {
            addLog("error", data.message || "Error durante la generación");
          }
        } catch (e) {
          console.error("Error parsing SSE:", e);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
      };

      return () => {
        eventSource.close();
      };
    }
  }, [activeProject?.id]);

  const getAgentStatus = (role: AgentRole) => {
    const status = agentStatuses.find(s => s.agentName.toLowerCase() === role);
    return {
      status: (status?.status as "idle" | "thinking" | "writing" | "editing" | "completed" | "error") || "idle",
      currentTask: status?.currentTask,
      lastActivity: status?.lastActivity ? new Date(status.lastActivity) : undefined,
    };
  };

  const completedChapters = chapters.filter(c => c.status === "completed").length;
  const totalWordCount = chapters.reduce((sum, c) => sum + (c.wordCount || 0), 0);

  const handleSubmit = (data: ConfigFormData) => {
    if (editingProject) {
      updateProjectMutation.mutate({ id: editingProject.id, data });
    } else {
      createProjectMutation.mutate(data);
    }
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
  };

  const handleStartGeneration = () => {
    if (latestProject && latestProject.status === "idle") {
      startGenerationMutation.mutate(latestProject.id);
    }
  };

  return (
    <div className="space-y-6 p-6" data-testid="dashboard-page">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Panel de Control</h1>
          <p className="text-muted-foreground mt-1">
            Orquestación de agentes literarios autónomos
          </p>
        </div>
        {activeProject && (
          <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 text-sm px-3 py-1">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Generando: {activeProject.title}
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AgentCard 
          name={agentNames.architect}
          role="architect"
          {...getAgentStatus("architect")}
        />
        <AgentCard 
          name={agentNames.ghostwriter}
          role="ghostwriter"
          {...getAgentStatus("ghostwriter")}
        />
        <AgentCard 
          name={agentNames.editor}
          role="editor"
          {...getAgentStatus("editor")}
        />
        <AgentCard 
          name={agentNames.copyeditor}
          role="copyeditor"
          {...getAgentStatus("copyeditor")}
        />
      </div>

      {activeProject && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Flujo de Proceso</CardTitle>
          </CardHeader>
          <CardContent>
            <ProcessFlow 
              currentStage={currentStage} 
              completedStages={completedStages} 
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Consola de Actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <ConsoleOutput logs={logs} />
            </CardContent>
          </Card>

          {latestProject && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-lg">Progreso del Manuscrito</CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{completedChapters}/{latestProject.chapterCount} capítulos</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{totalWordCount.toLocaleString()} palabras</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {chapters.map((chapter) => (
                    <div 
                      key={chapter.id}
                      className="flex items-center justify-between gap-4 p-2 rounded-md bg-muted/50"
                      data-testid={`progress-chapter-${chapter.chapterNumber}`}
                    >
                      <div className="flex items-center gap-2">
                        {chapter.status === "completed" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm font-medium">
                          Capítulo {chapter.chapterNumber}
                        </span>
                        {chapter.title && (
                          <span className="text-sm text-muted-foreground">
                            - {chapter.title}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {chapter.wordCount && chapter.wordCount > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {chapter.wordCount.toLocaleString()} palabras
                          </span>
                        )}
                        <Badge 
                          variant={chapter.status === "completed" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {chapter.status === "completed" ? "Completado" : 
                           chapter.status === "writing" ? "Escribiendo" :
                           chapter.status === "editing" ? "Editando" : "Pendiente"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                  {chapters.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Los capítulos aparecerán aquí conforme se generen
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-lg">
                {editingProject ? "Editar Proyecto" : "Nuevo Proyecto"}
              </CardTitle>
              {editingProject && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleCancelEdit}
                  data-testid="button-cancel-edit"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ConfigPanel 
                key={editingProject?.id || "new"}
                onSubmit={handleSubmit}
                isLoading={createProjectMutation.isPending || updateProjectMutation.isPending || startGenerationMutation.isPending}
                defaultValues={editingProject ? {
                  title: editingProject.title,
                  premise: editingProject.premise || "",
                  genre: editingProject.genre,
                  tone: editingProject.tone,
                  chapterCount: editingProject.chapterCount,
                  hasPrologue: editingProject.hasPrologue,
                  hasEpilogue: editingProject.hasEpilogue,
                  hasAuthorNote: editingProject.hasAuthorNote,
                  pseudonymId: editingProject.pseudonymId,
                  styleGuideId: editingProject.styleGuideId,
                } : undefined}
                isEditing={!!editingProject}
              />
            </CardContent>
          </Card>

          {latestProject && latestProject.status === "idle" && !editingProject && (
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    size="lg"
                    onClick={handleStartGeneration}
                    disabled={startGenerationMutation.isPending}
                    data-testid="button-continue-generation"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Generación
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    onClick={() => handleEditProject(latestProject)}
                    data-testid="button-edit-project"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Proyecto: {latestProject.title}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
