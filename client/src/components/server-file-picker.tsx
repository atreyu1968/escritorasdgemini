import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FolderOpen, 
  FileText, 
  Loader2, 
  RefreshCw,
  Trash2,
  HardDrive,
  AlertCircle,
} from "lucide-react";

interface ServerFile {
  name: string;
  path: string;
  size: number;
  extension: string;
  modifiedAt: string;
}

interface StorageInfo {
  inboxDir: string;
  exportsDir: string;
  inboxFiles: number;
  exportFiles: number;
}

interface ServerFilePickerProps {
  onFileSelect: (filename: string, content: string) => void;
  isProcessing?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ServerFilePicker({ onFileSelect, isProcessing }: ServerFilePickerProps) {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const { data: storageInfo } = useQuery<StorageInfo>({
    queryKey: ["/api/server-files/info"],
    refetchInterval: 30000,
  });

  const { data: inboxFiles = [], isLoading, refetch } = useQuery<ServerFile[]>({
    queryKey: ["/api/server-files/inbox"],
    refetchInterval: 10000,
  });

  const loadFileMutation = useMutation({
    mutationFn: async (filename: string) => {
      const response = await fetch(`/api/server-files/inbox/${encodeURIComponent(filename)}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al leer el archivo");
      }
      return response.json();
    },
    onSuccess: (data) => {
      onFileSelect(data.filename, data.content);
      toast({
        title: "Archivo cargado",
        description: `${data.filename} listo para procesar`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteFileMutation = useMutation({
    mutationFn: async (filename: string) => {
      await apiRequest("DELETE", `/api/server-files/inbox/${encodeURIComponent(filename)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/server-files/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/server-files/info"] });
      setSelectedFile(null);
      toast({
        title: "Archivo eliminado",
        description: "El archivo se ha eliminado del directorio de entrada",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSelectFile = (filename: string) => {
    setSelectedFile(filename);
    loadFileMutation.mutate(filename);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4" />
              Archivos del Servidor
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Coloca tus archivos en el directorio de entrada
            </CardDescription>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-inbox"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {storageInfo && (
          <div className="p-2 bg-muted rounded-md text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <FolderOpen className="h-3 w-3" />
              <code className="font-mono">{storageInfo.inboxDir}</code>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : inboxFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No hay archivos</p>
            <p className="text-xs mt-1">
              Copia archivos .docx, .txt o .md al directorio de entrada
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[250px]">
            <div className="space-y-2 pr-2">
              {inboxFiles.map((file) => (
                <div
                  key={file.name}
                  className={`flex items-center justify-between p-2 rounded-md border cursor-pointer hover-elevate ${
                    selectedFile === file.name ? "ring-2 ring-primary bg-muted/50" : ""
                  }`}
                  onClick={() => !isProcessing && handleSelectFile(file.name)}
                  data-testid={`file-item-${file.name}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <span>{formatDate(file.modifiedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-xs no-default-hover-elevate no-default-active-elevate">
                      {file.extension.replace(".", "").toUpperCase()}
                    </Badge>
                    {loadFileMutation.isPending && selectedFile === file.name && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteFileMutation.mutate(file.name);
                      }}
                      disabled={deleteFileMutation.isPending}
                      data-testid={`button-delete-file-${file.name}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex items-start gap-2 p-2 bg-blue-500/10 rounded-md text-xs text-blue-600 dark:text-blue-400">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Como subir archivos:</p>
            <p className="mt-1 text-muted-foreground">
              Usa SCP, SFTP o copia directa para colocar archivos en el directorio de entrada.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
