import { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Project } from "@shared/schema";

interface ProjectContextType {
  projects: Project[];
  isLoading: boolean;
  selectedProjectId: number | null;
  setSelectedProjectId: (id: number | null) => void;
  currentProject: Project | undefined;
}

const ProjectContext = createContext<ProjectContextType | null>(null);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    refetchInterval: 3000,
  });

  const activeProjects = projects.filter(p => p.status !== "archived");
  
  const currentProject = selectedProjectId 
    ? projects.find(p => p.id === selectedProjectId)
    : activeProjects[0];

  useEffect(() => {
    if (!selectedProjectId && activeProjects.length > 0) {
      setSelectedProjectId(activeProjects[0].id);
    }
  }, [activeProjects, selectedProjectId]);

  return (
    <ProjectContext.Provider value={{
      projects,
      isLoading,
      selectedProjectId,
      setSelectedProjectId,
      currentProject,
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
