import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, CheckCircle, Loader2, Clock } from "lucide-react";
import type { Chapter } from "@shared/schema";

interface ChapterListProps {
  chapters: Chapter[];
  selectedChapterId?: number;
  onSelectChapter: (chapter: Chapter) => void;
}

const statusConfig = {
  pending: { icon: Clock, color: "bg-muted text-muted-foreground", label: "Pendiente" },
  writing: { icon: Loader2, color: "bg-chart-2/20 text-chart-2", label: "Escribiendo" },
  editing: { icon: Loader2, color: "bg-chart-3/20 text-chart-3", label: "Editando" },
  completed: { icon: CheckCircle, color: "bg-green-500/20 text-green-600 dark:text-green-400", label: "Completado" },
};

export function ChapterList({ chapters, selectedChapterId, onSelectChapter }: ChapterListProps) {
  if (chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground text-sm">
          No hay capítulos todavía
        </p>
        <p className="text-muted-foreground/60 text-xs mt-1">
          Inicia un proyecto para generar capítulos
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="space-y-2 pr-4">
        {chapters.map((chapter) => {
          const config = statusConfig[chapter.status as keyof typeof statusConfig] || statusConfig.pending;
          const StatusIcon = config.icon;
          const isSelected = selectedChapterId === chapter.id;
          const isLoading = chapter.status === "writing" || chapter.status === "editing";

          return (
            <button
              key={chapter.id}
              onClick={() => onSelectChapter(chapter)}
              className={`
                w-full text-left p-3 rounded-md transition-all duration-200
                hover-elevate active-elevate-2
                ${isSelected 
                  ? "bg-sidebar-accent" 
                  : "bg-card"
                }
              `}
              data-testid={`button-chapter-${chapter.id}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium text-sm">
                  {chapter.chapterNumber === 0 ? "Prólogo" 
                    : chapter.chapterNumber === -1 ? "Epílogo" 
                    : chapter.chapterNumber === -2 ? "Nota del Autor"
                    : `Capítulo ${chapter.chapterNumber}`}
                </span>
                <Badge className={`${config.color} text-xs`}>
                  <StatusIcon className={`h-3 w-3 mr-1 ${isLoading ? "animate-spin" : ""}`} />
                  {config.label}
                </Badge>
              </div>
              {chapter.title && (
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {chapter.title}
                </p>
              )}
              {chapter.wordCount && chapter.wordCount > 0 && (
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {chapter.wordCount.toLocaleString()} palabras
                </p>
              )}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
