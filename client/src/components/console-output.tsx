import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Pencil, Eye, FileText, AlertCircle, CheckCircle } from "lucide-react";

type LogType = "thinking" | "writing" | "editing" | "polishing" | "error" | "success" | "info";

interface LogEntry {
  id: string;
  type: LogType;
  message: string;
  timestamp: Date;
  agent?: string;
}

interface ConsoleOutputProps {
  logs: LogEntry[];
}

const logIcons: Record<LogType, React.ReactNode> = {
  thinking: <Brain className="h-3.5 w-3.5" />,
  writing: <Pencil className="h-3.5 w-3.5" />,
  editing: <Eye className="h-3.5 w-3.5" />,
  polishing: <FileText className="h-3.5 w-3.5" />,
  error: <AlertCircle className="h-3.5 w-3.5" />,
  success: <CheckCircle className="h-3.5 w-3.5" />,
  info: <span className="h-3.5 w-3.5 inline-block text-center">i</span>,
};

const logPrefixes: Record<LogType, string> = {
  thinking: "[PENSANDO]",
  writing: "[ESCRIBIENDO]",
  editing: "[EDITANDO]",
  polishing: "[PULIENDO]",
  error: "[ERROR]",
  success: "[COMPLETADO]",
  info: "[INFO]",
};

const logColors: Record<LogType, string> = {
  thinking: "text-chart-1",
  writing: "text-chart-2",
  editing: "text-chart-3",
  polishing: "text-chart-4",
  error: "text-destructive",
  success: "text-green-500",
  info: "text-muted-foreground",
};

export function ConsoleOutput({ logs }: ConsoleOutputProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div 
      className="bg-card border border-card-border rounded-md font-mono text-sm"
      data-testid="console-output"
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-card-border">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Consola de Agentes
        </span>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
      </div>
      <ScrollArea className="h-64" ref={scrollRef}>
        <div className="p-4 space-y-1.5">
          {logs.length === 0 ? (
            <p className="text-muted-foreground/50 text-xs">
              Los registros de actividad aparecerán aquí cuando inicies un proyecto...
            </p>
          ) : (
            logs.map((log) => (
              <div 
                key={log.id} 
                className="flex items-start gap-2 leading-relaxed"
                data-testid={`log-entry-${log.id}`}
              >
                <span className="text-xs text-muted-foreground shrink-0 w-16">
                  {new Date(log.timestamp).toLocaleTimeString("es-ES", { 
                    hour: "2-digit", 
                    minute: "2-digit",
                    second: "2-digit"
                  })}
                </span>
                <span className={`flex items-center gap-1 shrink-0 ${logColors[log.type]}`}>
                  {logIcons[log.type]}
                  <span className="font-semibold">{logPrefixes[log.type]}</span>
                </span>
                <span className="text-foreground">{log.message}</span>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export type { LogEntry, LogType };
