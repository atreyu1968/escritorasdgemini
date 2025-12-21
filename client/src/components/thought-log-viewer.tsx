import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Brain, Pencil, Eye, FileText, Clock } from "lucide-react";
import type { ThoughtLog } from "@shared/schema";

interface ThoughtLogViewerProps {
  logs: ThoughtLog[];
  filter?: string;
}

const agentIcons: Record<string, React.ReactNode> = {
  architect: <Brain className="h-4 w-4" />,
  ghostwriter: <Pencil className="h-4 w-4" />,
  editor: <Eye className="h-4 w-4" />,
  copyeditor: <FileText className="h-4 w-4" />,
};

const agentColors: Record<string, string> = {
  architect: "bg-chart-1/10 text-chart-1",
  ghostwriter: "bg-chart-2/10 text-chart-2",
  editor: "bg-chart-3/10 text-chart-3",
  copyeditor: "bg-chart-4/10 text-chart-4",
};

const agentLabels: Record<string, string> = {
  architect: "El Arquitecto",
  ghostwriter: "El Narrador",
  editor: "El Editor",
  copyeditor: "El Estilista",
};

export function ThoughtLogViewer({ logs, filter }: ThoughtLogViewerProps) {
  const filteredLogs = filter 
    ? logs.filter(log => log.agentRole.toLowerCase() === filter.toLowerCase())
    : logs;

  if (filteredLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Brain className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground text-sm">
          No hay registros de pensamiento
        </p>
        <p className="text-muted-foreground/60 text-xs mt-1">
          Las firmas de pensamiento de los agentes aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[500px]" data-testid="thought-log-viewer">
      <Accordion type="multiple" className="space-y-2 pr-4">
        {filteredLogs.map((log) => {
          const role = log.agentRole.toLowerCase();
          const icon = agentIcons[role] || <Brain className="h-4 w-4" />;
          const color = agentColors[role] || "bg-muted text-muted-foreground";
          const label = agentLabels[role] || log.agentName;

          return (
            <AccordionItem 
              key={log.id} 
              value={`log-${log.id}`}
              className="border border-card-border rounded-md bg-card px-4"
            >
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <div className={`p-1.5 rounded-md ${color}`}>
                    {icon}
                  </div>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{label}</span>
                      {log.chapterId && (
                        <Badge variant="secondary" className="text-xs">
                          Cap. {log.chapterId}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString("es-ES")}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="bg-muted/50 rounded-md p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap overflow-x-auto">
                  {log.thoughtContent}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </ScrollArea>
  );
}
